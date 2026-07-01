import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import FileModel from '@/models/file.model';
import OrderModel from '@/models/order.model';
import ProductModel from '@/models/product.model';
import ReviewModel from '@/models/review.model';
import ReviewReactionModel from '@/models/review-reaction.model';
import UserModel from '@/models/user.model';
import NotificationModel from '@/models/notification.model';
import { FileOwnerType } from '@/types/file.type';
import { OrderStatus } from '@/types/order.type';
import { NotificationType } from '@/types/notification.type';
import { ReviewReactionType } from '@/types/review-reaction.type';
import { moderateReviewComment } from '@/services/ai.service';
import appAssert from '@/utils/app-assert';
import { TCreateReviewItem } from '@/validators/review.validator';
import mongoose from 'mongoose';
import type { Server } from 'socket.io';

const REVIEW_TOXIC_LIMIT = 3;
const REVIEW_BAN_HOURS = 24;
const REVIEW_MODERATION_MIN_DELAY_MS = 50_000;
const REVIEW_MODERATION_MAX_DELAY_MS = 60_000;

const emptyReactionSummary = () => ({
  like: 0,
  love: 0,
  haha: 0,
  wow: 0,
  sad: 0,
  angry: 0,
});

const assignReactionCount = (
  summary: ReturnType<typeof emptyReactionSummary>,
  reaction: unknown,
  count: number
) => {
  if (
    reaction === 'like' ||
    reaction === 'love' ||
    reaction === 'haha' ||
    reaction === 'wow' ||
    reaction === 'sad' ||
    reaction === 'angry'
  ) {
    summary[reaction] = count;
  }
};

const serializeImage = (image: any) => {
  if (typeof image === 'string') return image;

  return {
    _id: image._id,
    secureUrl: image.secureUrl ?? image.secure_url,
  };
};

const serializeReview = (review: any) => {
  const serialized = {
    ...review,
    images: (review.images ?? []).map(serializeImage),
  };

  if (serialized.isAnonymous) {
    delete serialized.userId;
  }

  return serialized;
};

export const createOrderReviews = async (
  userId: mongoose.Types.ObjectId,
  orderId: string,
  reviews: TCreateReviewItem[],
  io?: Server
) => {
  const user = await UserModel.findById(userId).select('reviewModeration').lean();
  appAssert(user, NOT_FOUND, 'Khong tim thay nguoi dung');

  const bannedUntil = user.reviewModeration?.reviewBannedUntil;
  appAssert(!bannedUntil || bannedUntil <= new Date(), BAD_REQUEST, 'Tai khoan dang bi tam khoa quyen danh gia');

  if (bannedUntil && bannedUntil <= new Date()) {
    await UserModel.findByIdAndUpdate(userId, {
      $set: {
        'reviewModeration.toxicCount': 0,
        'reviewModeration.reviewBannedUntil': null,
      },
    });
  }

  const order = await OrderModel.findOne({ _id: orderId, cusId: userId });
  appAssert(order, NOT_FOUND, 'Khong tim thay don hang');
  appAssert(order.status === OrderStatus.COMPLETED, BAD_REQUEST, 'Chi co the danh gia don hang da hoan thanh');

  const reviewDocs = [];
  for (const reviewData of reviews) {
    const { productId, rating, feedbackTags, comment, images, isAnonymous } = reviewData;

    const itemInOrder = order.items.find((item: any) => item.productId.toString() === productId);
    appAssert(itemInOrder, BAD_REQUEST, `San pham ${productId} khong co trong don hang nay`);

    if (images.length > 0) {
      const imageCount = await FileModel.countDocuments({
        _id: { $in: images },
        owner_id: userId,
        owner_type: FileOwnerType.REVIEW,
      });
      appAssert(imageCount === images.length, BAD_REQUEST, 'Anh danh gia khong hop le');
    }

    const review = await ReviewModel.findOneAndUpdate(
      { userId, orderId, productId },
      {
        rating,
        feedbackTags: rating < 3 ? feedbackTags : [],
        comment: comment || null,
        images,
        isAnonymous,
      },
      { new: true, upsert: true }
    ).populate('images');

    reviewDocs.push(review);
    await updateProductOverallRating(productId);

    if (review) {
      scheduleReviewModeration({
        reviewId: review._id,
        expectedUpdatedAt: review.updatedAt,
        userId,
        orderId: order._id,
        productId,
        comment,
        io,
      });
    }
  }

  return {
    reviews: reviewDocs.map((review) => serializeReview(review?.toObject?.() ?? review)),
    rejectedReviews: [] as {
      productId: string;
      reason: string;
      category: string;
      bannedUntil?: Date | null;
    }[],
  };
};

export const getOrderReviews = async (orderId: string, userId: mongoose.Types.ObjectId) => {
  appAssert(mongoose.isValidObjectId(orderId), BAD_REQUEST, 'Order id khong hop le');

  const reviews = await ReviewModel.find({ orderId, userId }).populate('images').lean();
  return reviews.map(serializeReview);
};

export const getProductReviews = async (
  productId: string,
  page = 1,
  limit = 10,
  userId?: mongoose.Types.ObjectId
) => {
  appAssert(mongoose.isValidObjectId(productId), BAD_REQUEST, 'Product id khong hop le');

  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    ReviewModel.find({ productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username avatar')
      .populate('images')
      .lean(),
    ReviewModel.countDocuments({ productId }),
  ]);

  const reviewIds = reviews.map((review) => review._id);
  const [reactionGroups, currentUserReactions] = await Promise.all([
    reviewIds.length > 0
      ? ReviewReactionModel.aggregate<{
          _id: { reviewId: mongoose.Types.ObjectId; reaction: ReviewReactionType };
          count: number;
        }>([
          { $match: { reviewId: { $in: reviewIds } } },
          {
            $group: {
              _id: { reviewId: '$reviewId', reaction: '$reaction' },
              count: { $sum: 1 },
            },
          },
        ])
      : [],
    userId && reviewIds.length > 0
      ? ReviewReactionModel.find({ reviewId: { $in: reviewIds }, userId })
          .select('reviewId reaction')
          .lean()
      : [],
  ]);

  const reactionSummaries = new Map<string, ReturnType<typeof emptyReactionSummary>>();
  for (const group of reactionGroups) {
    const reviewId = group._id.reviewId.toString();
    const summary = reactionSummaries.get(reviewId) ?? emptyReactionSummary();
    assignReactionCount(summary, group._id.reaction, group.count);
    reactionSummaries.set(reviewId, summary);
  }

  const currentReactions = new Map(
    currentUserReactions.map((reaction) => [reaction.reviewId.toString(), reaction.reaction])
  );

  return {
    reviews: reviews.map((review) => {
      const reviewId = review._id.toString();
      return {
        ...serializeReview(review),
        reactions: reactionSummaries.get(reviewId) ?? emptyReactionSummary(),
        currentUserReaction: currentReactions.get(reviewId) ?? null,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const setReviewReaction = async (
  reviewId: string,
  userId: mongoose.Types.ObjectId,
  reaction: ReviewReactionType | null
) => {
  appAssert(mongoose.isValidObjectId(reviewId), BAD_REQUEST, 'Review id khong hop le');
  const reviewExists = await ReviewModel.exists({ _id: reviewId });
  appAssert(reviewExists, NOT_FOUND, 'Khong tim thay danh gia');

  if (reaction) {
    await ReviewReactionModel.findOneAndUpdate(
      { reviewId, userId },
      { $set: { reaction } },
      { upsert: true, new: true }
    );
  } else {
    await ReviewReactionModel.deleteOne({ reviewId, userId });
  }

  const groups = await ReviewReactionModel.aggregate<{
    _id: ReviewReactionType;
    count: number;
  }>([
    { $match: { reviewId: new mongoose.Types.ObjectId(reviewId) } },
    { $group: { _id: '$reaction', count: { $sum: 1 } } },
  ]);

  const reactions = emptyReactionSummary();
  for (const group of groups) {
    assignReactionCount(reactions, group._id, group.count);
  }

  return {
    reviewId,
    reactions,
    currentUserReaction: reaction,
  };
};

export const getFeaturedReviews = async (limit = 3) => {
  const reviews = await ReviewModel.find({
    rating: { $gte: 4 },
    comment: { $type: 'string', $regex: /\S/ },
    productId: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(limit * 3)
    .populate('userId', 'username avatar')
    .populate({
      path: 'productId',
      select: 'name image isAvailable',
      match: { isAvailable: true },
    })
    .lean();

  return reviews
    .filter((review) => review.productId)
    .slice(0, limit)
    .map(serializeReview);
};

const updateProductOverallRating = async (productId: string) => {
  const result = await ReviewModel.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    const { averageRating, reviewCount } = result[0];
    await ProductModel.findByIdAndUpdate(productId, {
      rating: Math.round(averageRating * 10) / 10,
      reviewCount,
    });
    return;
  }

  await ProductModel.findByIdAndUpdate(productId, {
    rating: 0,
    reviewCount: 0,
  });
};

const recordToxicReviewAttempt = async (userId: mongoose.Types.ObjectId) => {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      $inc: { 'reviewModeration.toxicCount': 1 },
      $set: { 'reviewModeration.lastToxicAt': new Date() },
    },
    { new: true }
  ).select('reviewModeration');

  const toxicCount = user?.reviewModeration?.toxicCount ?? 1;
  const reviewBannedUntil =
    toxicCount >= REVIEW_TOXIC_LIMIT ? new Date(Date.now() + REVIEW_BAN_HOURS * 60 * 60 * 1000) : null;

  if (reviewBannedUntil) {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { 'reviewModeration.reviewBannedUntil': reviewBannedUntil },
    });
  }

  return {
    toxicCount,
    reviewBannedUntil,
  };
};

const getReviewModerationDelayMs = () =>
  REVIEW_MODERATION_MIN_DELAY_MS +
  Math.floor(Math.random() * (REVIEW_MODERATION_MAX_DELAY_MS - REVIEW_MODERATION_MIN_DELAY_MS + 1));

const scheduleReviewModeration = (payload: {
  reviewId: mongoose.Types.ObjectId;
  expectedUpdatedAt: Date;
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  productId: string;
  comment: string;
  io?: Server;
}) => {
  const timer = setTimeout(() => {
    void moderateSavedReview(payload);
  }, getReviewModerationDelayMs());

  timer.unref?.();
};

const moderateSavedReview = async ({
  reviewId,
  expectedUpdatedAt,
  userId,
  orderId,
  productId,
  comment,
  io,
}: {
  reviewId: mongoose.Types.ObjectId;
  expectedUpdatedAt: Date;
  userId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  productId: string;
  comment: string;
  io?: Server;
}) => {
  try {
    const moderation = await moderateReviewComment(comment);
    if (moderation.action !== 'delete') return;

    const deleted = await ReviewModel.deleteOne({
      _id: reviewId,
      updatedAt: expectedUpdatedAt,
    });
    if (deleted.deletedCount === 0) return;

    await ReviewReactionModel.deleteMany({ reviewId });
    await updateProductOverallRating(productId);
    const violation = await recordToxicReviewAttempt(userId);
    const bannedMessage = violation.reviewBannedUntil
      ? ' Bạn đã bị tạm khóa quyền đánh giá trong 24 giờ.'
      : '';

    const notification = await NotificationModel.create({
      userId,
      orderId,
      title: 'Đánh giá đã bị xóa',
      body: `Đánh giá của bạn đã bị xóa do vi phạm chính sách nội dung.${bannedMessage}`,
      type: NotificationType.SYSTEM,
      isRead: false,
    });

    io?.to(`user:${userId.toString()}`).emit('notification:new', notification.toObject());
  } catch (error) {
    console.error('[ReviewModeration] Background moderation failed', {
      reviewId: reviewId.toString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

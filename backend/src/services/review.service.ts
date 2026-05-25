import ReviewModel from '@/models/review.model';
import ProductModel from '@/models/product.model';
import OrderModel from '@/models/order.model';
import appAssert from '@/utils/app-assert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { IReview } from '@/types';
import mongoose from 'mongoose';

export const createOrderReviews = async (userId: string, orderId: string, reviews: any[]) => {
  const order = await OrderModel.findOne({ _id: orderId, cusId: userId });
  appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng');

  const reviewDocs = [];

  for (const reviewData of reviews) {
    const { productId, rating, comment, images, isAnonymous } = reviewData;

    // Verify product is in the order
    const itemInOrder = order.items.find((item: any) => item.productId.toString() === productId);
    appAssert(itemInOrder, BAD_REQUEST, `Sản phẩm ${productId} không có trong đơn hàng này`);

    // Create or update review (Upsert)
    const review = await ReviewModel.findOneAndUpdate(
      { userId, orderId, productId },
      { 
        rating, 
        comment, 
        images, 
        isAnonymous 
      },
      { new: true, upsert: true }
    );
    reviewDocs.push(review);

    // Update product rating and review count
    await updateProductOverallRating(productId);
  }

  return reviewDocs;
};

export const getOrderReviews = async (orderId: string, userId: string) => {
  return ReviewModel.find({ orderId, userId })
    .populate('images')
    .lean();
};

export const getProductReviews = async (productId: string, page = 1, limit = 10) => {
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

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const updateProductOverallRating = async (productId: string) => {
  const result = await ReviewModel.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (result.length > 0) {
    const { averageRating, reviewCount } = result[0];
    await ProductModel.findByIdAndUpdate(productId, {
      rating: Math.round(averageRating * 10) / 10,
      review_count: reviewCount
    });
  }
};

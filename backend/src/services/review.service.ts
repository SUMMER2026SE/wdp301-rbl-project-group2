import ReviewModel from '@/models/review.model';
import ProductModel from '@/models/product.model';
import OrderModel from '@/models/order.model';
import appAssert from '@/utils/appAssert';
import { BAD_REQUEST, NOT_FOUND } from '@/constants/http';
import { IReview } from '@/types';
import mongoose from 'mongoose';

export const createOrderReviews = async (userId: string, orderId: string, reviews: any[]) => {
  // 1. Verify order exists, belongs to user, and is completed
  const order = await OrderModel.findOne({ _id: orderId, user_id: userId });
  appAssert(order, NOT_FOUND, 'Không tìm thấy đơn hàng');
  // appAssert(order.status === 'completed', BAD_REQUEST, 'Đơn hàng chưa hoàn thành để đánh giá');

  const reviewDocs = [];

  for (const reviewData of reviews) {
    const { product_id, rating, comment, images, isAnonymous } = reviewData;

    // Verify product is in the order
    const itemInOrder = order.items.find(item => item.product_id.toString() === product_id);
    appAssert(itemInOrder, BAD_REQUEST, `Sản phẩm ${product_id} không có trong đơn hàng này`);

    // Create or update review (Upsert)
    const review = await ReviewModel.findOneAndUpdate(
      { user_id: userId, order_id: orderId, product_id },
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
    await updateProductOverallRating(product_id);
  }

  return reviewDocs;
};

export const getOrderReviews = async (orderId: string, userId: string) => {
  return ReviewModel.find({ order_id: orderId, user_id: userId })
    .populate('images')
    .lean();
};

export const getProductReviews = async (productId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [reviews, total] = await Promise.all([
    ReviewModel.find({ product_id: productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user_id', 'username email avatar')
      .populate('images')
      .lean(),
    ReviewModel.countDocuments({ product_id: productId }),
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
    { $match: { product_id: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: '$product_id',
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

import { CREATED, OK } from '@/constants/http';
import {
  createOrderReviews,
  getFeaturedReviews,
  getProductReviews,
  getOrderReviews,
  setReviewReaction,
} from '@/services/review.service';
import { catchErrors } from '@/utils/async-handler';
import {
  createOrderReviewsValidator,
  featuredReviewQueryValidator,
  reviewReactionValidator,
  reviewListQueryValidator,
} from '@/validators/review.validator';

export const getFeaturedReviewsHandler = catchErrors(async (req, res) => {
  const { limit } = featuredReviewQueryValidator.parse(req.query);
  const reviews = await getFeaturedReviews(limit);

  return res.success(OK, {
    data: reviews,
  });
});

export const getOrderReviewsHandler = catchErrors(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.userId;

  const reviews = await getOrderReviews(orderId, userId);

  return res.success(OK, {
    data: reviews,
  });
});

export const createOrderReviewsHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const { orderId, reviews } = createOrderReviewsValidator.parse(req.body);

  const result = await createOrderReviews(userId, orderId, reviews, req.app.get('io'));

  return res.success(CREATED, {
    data: result,
    message: 'Đánh giá đơn hàng thành công',
  });
});

export const getProductReviewsHandler = catchErrors(async (req, res) => {
  const { productId } = req.params;
  const { page, limit } = reviewListQueryValidator.parse(req.query);

  const result = await getProductReviews(productId, page, limit, req.userId);

  return res.success(OK, {
    data: result.reviews,
    pagination: result.pagination
  });
});

export const setReviewReactionHandler = catchErrors(async (req, res) => {
  const { reaction } = reviewReactionValidator.parse(req.body);
  const result = await setReviewReaction(req.params.reviewId, req.userId, reaction);

  return res.success(OK, {
    data: result,
    message: reaction ? 'Da cap nhat cam xuc cho danh gia' : 'Da bo cam xuc khoi danh gia',
  });
});

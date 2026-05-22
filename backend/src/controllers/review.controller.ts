import { CREATED, OK } from '@/constants/http';
import { createOrderReviews, getProductReviews, getOrderReviews } from '@/services/review.service';
import { catchErrors } from '@/utils/asyncHandler';

export const getOrderReviewsHandler = catchErrors(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.userId as unknown as string;

  const reviews = await getOrderReviews(orderId, userId);

  return res.success(OK, {
    data: reviews,
  });
});

export const createOrderReviewsHandler = catchErrors(async (req, res) => {
  const userId = req.userId as unknown as string;
  const { order_id, reviews } = req.body;

  const result = await createOrderReviews(userId, order_id, reviews);

  return res.success(CREATED, {
    data: result,
    message: 'Đánh giá đơn hàng thành công',
  });
});

export const getProductReviewsHandler = catchErrors(async (req, res) => {
  const { productId } = req.params;
  const { page, limit } = req.query;

  const result = await getProductReviews(
    productId,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 10
  );

  return res.success(OK, {
    data: result.reviews,
    pagination: result.pagination
  });
});

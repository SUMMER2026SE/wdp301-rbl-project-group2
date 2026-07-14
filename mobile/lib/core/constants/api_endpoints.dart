/// Centralized API endpoint constants.
/// All paths are relative to the base URL configured in [ApiClient].
class ApiEndpoints {
  ApiEndpoints._();

  // ── Health ──
  static const String health = '/health';

  // ── Auth ──
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String googleLogin = '/auth/google';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String verifyEmail = '/auth/verify-email';
  static const String resendVerifyEmail = '/auth/resend-verify-email';
  static const String forgotPassword = '/auth/password/forgot';
  static const String verifyPasswordOtp = '/auth/password/verify-otp';
  static const String resetPassword = '/auth/password/reset';

  // ── Users / Profile ──
  static const String userProfile = '/users/me';
  static const String changePassword = '/users/me/password';
  static const String userAddresses = '/users/me';
  static const String userPreferences = '/users/me';
  static const String userMembership = '/users/me/membership';
  static const String userPoints = '/users/me/points';
  static const String userPointsHistory = '/users/me/points';

  // ── Products / Menu ──
  static const String products = '/products';
  static const String productCategories = '/products/categories';
  static String productById(String id) => '/products/$id';
  static String productHealthRisk(String id) => '/products/$id/health-risk';
  static String productAvailability(String id) => '/products/$id/availability';
  static const String safeFoods = '/products/safe-foods';
  static const String recommendations = '/products/recommendations';

  // ── Cart ──
  static const String cart = '/cart';
  static const String cartAdd = '/cart/items';
  static const String cartUpdate = '/cart/items';
  static const String cartRemove = '/cart/items';
  static const String cartClear = '/cart';
  static const String cartMerge = '/cart/merge';

  // ── Orders ──
  static const String orders = '/orders';
  static const String myOrders = '/orders/me';
  static String orderById(String id) => '/orders/$id';
  static String cancelOrder(String id) => '/orders/$id/cancel';
  static String customerConfirm(String id) => '/orders/$id/customer-confirm';

  // ── Staff Orders ──
  static const String staffOrders = '/orders/staff/orders';
  static String staffOrderById(String id) => '/orders/staff/orders/$id';
  static String staffConfirmOrder(String id) =>
      '/orders/staff/orders/$id/confirm';
  static String staffRejectOrder(String id) =>
      '/orders/staff/orders/$id/reject';
  static String staffReadyOrder(String id) => '/orders/staff/orders/$id/ready';
  static String staffDeliverOrder(String id) =>
      '/orders/staff/orders/$id/deliver';
  static String staffCompleteOrder(String id) =>
      '/orders/staff/orders/$id/complete';

  // ── Vouchers ──
  static const String vouchers = '/vouchers';
  static String voucherById(String id) => '/vouchers/$id';
  static const String voucherWallet = '/vouchers';
  static String voucherRedeem(String id) => '/vouchers/$id/redeem';
  static const String voucherValidate = '/vouchers/validate';

  // ── Campaigns ──
  static const String campaigns = '/campaigns';
  static String campaignById(String id) => '/campaigns/$id';

  // ── Reviews ──
  static const String reviews = '/reviews';
  static const String featuredReviews = '/reviews/featured';
  static String reviewByOrder(String id) => '/reviews/order/$id';
  static String productReviews(String id) => '/reviews/product/$id';

  // ── Notifications ──
  static const String notifications = '/notifications';
  static const String notificationsUnreadCount = '/notifications/unread-count';
  static String notificationRead(String id) => '/notifications/$id/read';
  static const String notificationsReadAll = '/notifications/read-all';

  // ── Support Chat ──
  static const String supportConversations = '/support/conversations';
  static String supportMessages(String id) =>
      '/support/conversations/$id/messages';
  static String supportMarkRead(String id) => '/support/conversations/$id/read';
  static String supportClose(String id) => '/support/conversations/$id/close';
  static const String staffConversations = '/support/staff/conversations';
  static const String supportSettings = '/support/settings';

  // ── Files ──
  static const String fileUpload = '/files/upload';

  // ── Stores ──
  static const String stores = '/stores';

  // ── Settings ──
  static const String settings = '/settings';

  // ── Payments ──
  static const String paymentsPayosCancel = '/payments/payos/cancel';

  // ── Location ──
  static const String location = '/location';
}

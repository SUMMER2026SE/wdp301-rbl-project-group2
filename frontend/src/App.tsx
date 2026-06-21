import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { OrderNotificationListener } from "./components/shared/OrderNotificationListener";
import HomePage from "./pages/Home";
import VouchersPage from "./pages/Vouchers";
import VoucherDetailPage from "./pages/VoucherDetail";
import MenuPage from "./pages/Menu";
import FoodDetailPage from "./pages/FoodDetail";
import ShoppingCartPage from "./pages/ShoppingCart";
import CheckoutPage from "./pages/Checkout";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import VerifyEmailPage from "./pages/Register/VerifyEmail";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import OnboardingPage from "./pages/Onboarding";
import RequireAuth from "./components/guards/RequireAuth";
import RequireRole from "./components/guards/RequireRole";
import ProfileLayout from "./pages/Profile/ProfileLayout";
import ProfileSettingsPage from "./pages/ProfileSettings";
import OrderHistoryTabContent from "./pages/OrderHistory/OrderHistoryTab";
import VoucherWalletProfilePage from "./pages/Profile/VoucherWallet";
import AddressesPage from "./pages/Addresses";
import SafeAlternativesPage from "./pages/SafeAlternatives";
import VoucherWalletPage from "./pages/VoucherWallet";
import MembershipBenefitsPage from "./pages/MembershipBenefits";
import OrderRatingPage from "./pages/OrderRating";
import OrderSuccessPage from "./pages/OrderSuccess";
import OrderFailedPage from "./pages/OrderFailed";
import OrderDetailPage from "./pages/OrderDetail";
import TrackOrderPage from "./pages/TrackOrder";
import AboutPage from "./pages/About";
import BlogDetailPage from "./pages/BlogDetailPage";
import CustomerMessagesPage from "./pages/Profile/Messages";
import NotFoundPage from "./pages/NotFound";
import CampaignProductsPage from "./pages/CampaignProducts";
import ForbiddenPage from "./pages/Forbidden";
import MainLayout from "./components/layout/MainLayout";
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminMenuManagement from "./pages/Admin/MenuManagement";
import AdminOrders from "./pages/Admin/Orders";
import AdminVouchers from "./pages/Admin/Vouchers";
import AdminCampaigns from "./pages/Admin/Campaigns";
import AdminCustomers from "./pages/Admin/Customers";
// import AdminAnalytics from "./pages/Admin/Analytics";
import AdminManager from "./pages/Admin/Manager";
import AdminStaffRequests from "./pages/Admin/StaffRequests";
import AdminReviews from "./pages/Admin/Reviews";
import AdminDelivery from "./pages/Admin/Delivery";
import AdminDispatch from "./pages/Admin/Dispatch";
import AdminIngredients from "./pages/Admin/Ingredients";
import AdminOperationsLayout from "./pages/Admin/OperationsLayout";
import AdminCashControl from "./pages/Admin/CashControl";
import AdminStores from "./pages/Admin/Stores";
import StaffLayout from "./components/layout/StaffLayout";
import StaffDashboard from "./pages/Staff/Dashboard";
import StaffOrders from "./pages/Staff/Orders";
import StaffOrderDetail from "./pages/Staff/Orders/OrderDetail";
import StaffMenu from "./pages/Staff/Menu";
import StaffSupportChatPage from "./pages/Staff/SupportChat";
import StaffSupportSettingsPage from "./pages/Staff/SupportSettings";
import StaffDeliveryMode from "./pages/Staff/DeliveryMode";
import StaffCustomerProfile from "./pages/Staff/CustomerProfile";
import StaffNoStore from "./pages/Staff/NoStore";
import ManagerLayout from "./components/layout/ManagerLayout";
import RequireStaffStore from "./components/guards/RequireStaffStore";
import RequireManagerStore from "./components/guards/RequireManagerStore";
import ManagerDashboard from "./pages/Manager/Dashboard";
import ManagerNoStore from "./pages/Manager/NoStore";
import ManagerOrders from "./pages/Manager/Orders";
import ManagerOrderDetail from "./pages/Manager/Orders/OrderDetail";
import ManagerMenu from "./pages/Manager/Menu";
import ManagerCash from "./pages/Manager/Cash";
import ManagerStaff from "./pages/Manager/Staff";
import ManagerStaffRequests from "./pages/Manager/StaffRequests";
import ManagerSettings from "./pages/Manager/Settings";
import { AddToCartWarningModal } from "./components/shared/AddToCartWarningModal";
import ScrollToTop from "./components/common/ScrollToTop";

import { useStoreStore } from "./store/storeStore";

function App() {
  const { hydrate, getUser, isAuthenticated } = useAuth();
  const { hydrate: hydrateCart } = useCart();
  const { hydrate: hydrateStore } = useStoreStore();

  useEffect(() => {
    hydrate();
    hydrateCart();
    hydrateStore();
  }, [hydrate, hydrateCart, hydrateStore]);

  useEffect(() => {
    // Only sync when FE believes we're logged in (hydrated from storage)
    if (isAuthenticated) {
      void getUser();
    }
  }, [isAuthenticated, getUser]);

  return (
    <BrowserRouter>
      <OrderNotificationListener />
      <ScrollToTop />
      <Toaster position="top-right" />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/vouchers" element={<VouchersPage />} />
          <Route path="/vouchers/:id" element={<VoucherDetailPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/products-campaign/:id" element={<CampaignProductsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<Navigate to="/" replace />} />
          <Route path="/blog/:id" element={<BlogDetailPage />} />
          <Route path="/food/:id" element={<FoodDetailPage />} />
          {/* Cart: cho phép guest xem/thao tác, nhưng checkout vẫn yêu cầu đăng nhập */}
          <Route path="/cart" element={<ShoppingCartPage />} />
          {/* Protected customer routes */}
          <Route element={<RequireAuth />}>
            {/* /checkout requires auth — unauthenticated users redirect to login */}
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/profile" element={<ProfileLayout />}>
              <Route index element={<ProfileSettingsPage />} />
              <Route path="history" element={<OrderHistoryTabContent />} />
              <Route path="wallet" element={<VoucherWalletProfilePage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="messages" element={<CustomerMessagesPage />} />
            </Route>
            <Route
              path="/messages"
              element={<Navigate to="/profile/messages" replace />}
            />
            <Route
              path="/history"
              element={<Navigate to="/profile/history" replace />}
            />
            <Route
              path="/addresses"
              element={<Navigate to="/profile/addresses" replace />}
            />
            <Route path="/ai-suggestions" element={<SafeAlternativesPage />} />
            <Route path="/wallet" element={<VoucherWalletPage />} />
            <Route path="/membership" element={<MembershipBenefitsPage />} />
            <Route path="/rating/:orderId" element={<OrderRatingPage />} />
            <Route path="/success" element={<OrderSuccessPage />} />
            <Route path="/failed" element={<OrderFailedPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/track-order" element={<TrackOrderPage />} />
          </Route>
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        {/* Staff — protected by role and assigned store */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowedRoles={["STAFF"]} />}>
            <Route path="/staff/no-store" element={<StaffNoStore />} />
            <Route element={<RequireStaffStore />}>
              <Route path="/staff" element={<StaffLayout />}>
                <Route index element={<StaffDashboard />} />
                <Route path="orders" element={<StaffOrders />} />
                <Route path="orders/:id" element={<StaffOrderDetail />} />
                <Route path="delivery" element={<StaffDeliveryMode />} />
                <Route path="menu" element={<StaffMenu />} />
                <Route path="support" element={<StaffSupportChatPage />} />
                <Route
                  path="support/settings"
                  element={<StaffSupportSettingsPage />}
                />
                <Route path="customers" element={<StaffCustomerProfile />} />
                <Route
                  path="customers/:id"
                  element={<StaffCustomerProfile />}
                />
                <Route path="*" element={<Navigate to="/staff" replace />} />
              </Route>
            </Route>
          </Route>
        </Route>
        {/* Manager — protected by role and assigned store */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowedRoles={["MANAGER"]} />}>
            <Route path="/manager/no-store" element={<ManagerNoStore />} />
            <Route element={<RequireManagerStore />}>
              <Route path="/manager" element={<ManagerLayout />}>
                <Route
                  index
                  element={<Navigate to="/manager/dashboard" replace />}
                />
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="orders" element={<ManagerOrders />} />
                <Route path="orders/:id" element={<ManagerOrderDetail />} />
                <Route path="menu" element={<ManagerMenu />} />
                <Route path="cash" element={<ManagerCash />} />
                <Route path="staff" element={<ManagerStaff />} />
                <Route
                  path="staff-requests"
                  element={<ManagerStaffRequests />}
                />
                <Route path="settings" element={<ManagerSettings />} />
                <Route
                  path="*"
                  element={<Navigate to="/manager/dashboard" replace />}
                />
              </Route>
            </Route>
          </Route>
        </Route>
        {/* Admin — protected by role */}
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allowedRoles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route element={<AdminOperationsLayout />}>
                <Route path="orders" element={<AdminOrders />} />
                <Route path="cash-control" element={<AdminCashControl />} />
                <Route path="dispatch" element={<AdminDispatch />} />
                <Route path="delivery" element={<AdminDelivery />} />
              </Route>
              <Route path="menu" element={<AdminMenuManagement />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="manager" element={<AdminManager />} />
              <Route path="staff-requests" element={<AdminStaffRequests />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="vouchers" element={<AdminVouchers />} />
              <Route path="campaigns" element={<AdminCampaigns />} />
              <Route path="stores" element={<AdminStores />} />
              <Route path="ingredients" element={<AdminIngredients />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
        </Route>
        {/* Error pages */}
        <Route path="/403" element={<ForbiddenPage />} />
        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <AddToCartWarningModal />
    </BrowserRouter>
  );
}

export default App;

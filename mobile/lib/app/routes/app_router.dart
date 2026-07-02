import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/features/auth/presentation/pages/splash_page.dart';
import 'package:foa_mobile/features/auth/presentation/pages/login_page.dart';
import 'package:foa_mobile/features/auth/presentation/pages/register_page.dart';
import 'package:foa_mobile/features/auth/presentation/pages/forgot_password_page.dart';
import 'package:foa_mobile/features/auth/presentation/pages/verify_email_page.dart';
import 'package:foa_mobile/features/auth/presentation/pages/reset_password_page.dart';
import 'package:foa_mobile/features/auth/presentation/pages/onboarding_page.dart';
import 'package:foa_mobile/features/home/presentation/pages/home_page.dart';
import 'package:foa_mobile/features/menu/presentation/pages/menu_page.dart';
import 'package:foa_mobile/features/food_detail/presentation/pages/food_detail_page.dart';
import 'package:foa_mobile/features/cart/presentation/pages/cart_page.dart';
import 'package:foa_mobile/features/checkout/presentation/pages/checkout_page.dart';
import 'package:foa_mobile/features/orders/presentation/pages/order_history_page.dart';
import 'package:foa_mobile/features/orders/presentation/pages/order_detail_page.dart';
import 'package:foa_mobile/features/orders/presentation/pages/track_order_page.dart';
import 'package:foa_mobile/features/profile/presentation/pages/profile_page.dart';
import 'package:foa_mobile/features/profile/presentation/pages/edit_profile_page.dart';
import 'package:foa_mobile/features/profile/presentation/pages/address_page.dart';
import 'package:foa_mobile/features/profile/presentation/pages/health_preferences_page.dart';
import 'package:foa_mobile/features/vouchers/presentation/pages/voucher_list_page.dart';
import 'package:foa_mobile/features/vouchers/presentation/pages/voucher_wallet_page.dart';
import 'package:foa_mobile/features/vouchers/presentation/pages/voucher_detail_page.dart';
import 'package:foa_mobile/features/campaigns/presentation/pages/campaign_products_page.dart';
import 'package:foa_mobile/features/membership/presentation/pages/membership_page.dart';
import 'package:foa_mobile/features/notifications/presentation/pages/notification_list_page.dart';
import 'package:foa_mobile/features/support_chat/presentation/pages/chat_list_page.dart';
import 'package:foa_mobile/features/support_chat/presentation/pages/chat_detail_page.dart';
import 'package:foa_mobile/features/reviews/presentation/pages/order_rating_page.dart';
import 'package:foa_mobile/features/about/presentation/pages/about_page.dart';
import 'package:foa_mobile/features/ai_suggestions/presentation/pages/ai_suggestions_page.dart';
import 'package:foa_mobile/features/staff_orders/presentation/pages/staff_order_list_page.dart';
import 'package:foa_mobile/features/staff_orders/presentation/pages/staff_order_detail_page.dart';
import 'package:foa_mobile/features/staff_delivery/presentation/pages/staff_delivery_page.dart';
import 'package:foa_mobile/features/staff_menu/presentation/pages/staff_menu_page.dart';
import 'package:foa_mobile/features/staff_chat/presentation/pages/staff_chat_list_page.dart';
import 'package:foa_mobile/features/staff_chat/presentation/pages/staff_chat_page.dart';
import 'package:foa_mobile/features/staff_chat/presentation/pages/staff_settings_page.dart';
import 'package:foa_mobile/features/staff_orders/presentation/pages/staff_no_store_page.dart';
import 'package:foa_mobile/features/staff_customers/presentation/pages/customer_search_page.dart';
import 'package:foa_mobile/features/staff_customers/presentation/pages/customer_detail_page.dart';
import 'package:foa_mobile/features/orders/presentation/pages/order_success_page.dart';
import 'package:foa_mobile/features/orders/presentation/pages/order_failed_page.dart';
import 'package:foa_mobile/shared/widgets/payos_webview.dart';
/// GoRouter configuration with auth and role-based guards.
class AppRouter {
  final AuthBloc authBloc;

  AppRouter({required this.authBloc});

  late final GoRouter router = GoRouter(
    initialLocation: '/splash',
    debugLogDiagnostics: false,
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    redirect: _globalRedirect,
    routes: [
      // ── Splash / Loading ──
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),

      // ── Auth Routes ──
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) {
          final email = state.extra as String?;
          return VerifyEmailPage(email: email);
        },
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) {
          final email = state.extra as String?;
          return ResetPasswordPage(email: email);
        },
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => OnboardingPage(
          email: state.extra as String?,
        ),
      ),

      // ── Customer Shell (Bottom Nav) ──
      ShellRoute(
        builder: (context, state, child) => _CustomerShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: '/menu',
            builder: (context, state) {
              final category = state.uri.queryParameters['category'];
              final search = state.uri.queryParameters['search'];
              return MenuPage(
                initialCategory: category,
                initialSearch: search,
              );
            },
          ),
          GoRoute(
            path: '/cart',
            builder: (context, state) => const CartPage(),
          ),
          GoRoute(
            path: '/orders',
            builder: (context, state) => const OrderHistoryPage(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),

      // ── Customer Detail Routes ──
      GoRoute(
        path: '/food/:id',
        builder: (context, state) => FoodDetailPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) {
          final extra = state.extra;
          List<String>? selectedItemIds;
          String? note;
          if (extra is List<String>) {
            selectedItemIds = extra;
          } else if (extra is Map<String, dynamic>) {
            selectedItemIds = (extra['selectedItemIds'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList();
            note = extra['note'] as String?;
          }
          return CheckoutPage(selectedItemIds: selectedItemIds, note: note);
        },
      ),
      GoRoute(
        path: '/orders/:id',
        builder: (context, state) => OrderDetailPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/track-order/:id',
        builder: (context, state) => TrackOrderPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/payment-webview',
        builder: (context, state) {
          final paymentUrl = state.extra as String? ?? '';
          return WebViewPage(
            paymentUrl: paymentUrl,
            onSuccess: () {
              // The PayOSWebView handles navigation via redirect URL detection.
              // After a success redirect, the onSuccess callback is called.
              // We pop back and let the caller handle the navigation.
              if (context.mounted) context.pop(true);
            },
            onFailed: () {
              if (context.mounted) context.pop(false);
            },
          );
        },
      ),
      GoRoute(
        path: '/order-success/:id',
        builder: (context, state) => OrderSuccessPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/order-failed/:id',
        builder: (context, state) => OrderFailedPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/vouchers',
        builder: (context, state) => const VoucherListPage(),
      ),
      GoRoute(
        path: '/voucher-wallet',
        builder: (context, state) => const VoucherWalletPage(),
      ),
      GoRoute(
        path: '/vouchers/:id',
        builder: (context, state) => VoucherDetailPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/membership',
        builder: (context, state) => const MembershipPage(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationListPage(),
      ),
      GoRoute(
        path: '/chat',
        builder: (context, state) => ChatListPage(
          initialOrderId: state.uri.queryParameters['orderId'],
        ),
      ),
      GoRoute(
        path: '/chat/:conversationId',
        builder: (context, state) => ChatDetailPage(
          conversationId: state.pathParameters['conversationId'] ?? '',
          title: state.extra as String? ?? 'Hỗ trợ',
        ),
      ),
      GoRoute(
        path: '/rating/:orderId',
        builder: (context, state) => OrderRatingPage(orderId: state.pathParameters['orderId'] ?? ''),
      ),
      GoRoute(
        path: '/campaign/:id',
        builder: (context, state) =>
            CampaignProductsPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/ai-suggestions',
        builder: (context, state) => const AiSuggestionsPage(),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const EditProfilePage(),
      ),
      GoRoute(
        path: '/profile/addresses',
        builder: (context, state) => const AddressPage(),
      ),
      GoRoute(
        path: '/profile/health',
        builder: (context, state) => const HealthPreferencesPage(),
      ),
      GoRoute(
        path: '/profile/about',
        builder: (context, state) => const AboutPage(),
      ),

      // ── Staff Shell (Bottom Nav) ──
      ShellRoute(
        builder: (context, state, child) => _StaffShell(child: child),
        routes: [
          GoRoute(
            path: '/staff/orders',
            builder: (context, state) => const StaffOrderListPage(),
          ),
          GoRoute(
            path: '/staff/delivery',
            builder: (context, state) => const StaffDeliveryPage(),
          ),
          GoRoute(
            path: '/staff/menu',
            builder: (context, state) => const StaffMenuPage(),
          ),
          GoRoute(
            path: '/staff/chat',
            builder: (context, state) => const StaffChatListPage(),
          ),
          GoRoute(
            path: '/staff/settings',
            builder: (context, state) => const StaffSettingsPage(),
          ),
        ],
      ),

      // ── Staff Detail Routes ──
      GoRoute(
        path: '/staff/orders/:id',
        builder: (context, state) => StaffOrderDetailPage(id: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/staff/chat/:conversationId',
        builder: (context, state) => StaffChatPage(
          conversationId: state.pathParameters['conversationId'] ?? '',
          initialConversation: state.extra is ConversationModel
              ? state.extra as ConversationModel
              : null,
        ),
      ),
      GoRoute(
        path: '/staff/customers',
        builder: (context, state) => const CustomerSearchPage(),
      ),
      GoRoute(
        path: '/staff/customers/:customerId',
        builder: (context, state) => CustomerDetailPage(
          customerId: state.pathParameters['customerId'] ?? '',
        ),
      ),
      GoRoute(
        path: '/staff/no-store',
        builder: (context, state) => const StaffNoStorePage(),
      ),
    ],
  );

  /// Global redirect logic based on auth state.
  String? _globalRedirect(BuildContext context, GoRouterState state) {
    final authState = authBloc.state;
    final currentPath = state.uri.path;

    // Public routes that don't require auth.
    const publicPaths = [
      '/splash', '/login', '/register', '/verify-email',
      '/forgot-password', '/reset-password', '/onboarding',
    ];
    final isPublicRoute = publicPaths.contains(currentPath);

    if (authState is AuthInitial) {
      return currentPath == '/splash' ? null : '/splash';
    }

    if (authState is AuthLoading) {
      // Only force splash if user is currently at splash or root
      if (currentPath == '/splash' || currentPath == '/') {
        return null;
      }
      return null; // Keep the current route to show inline loading indicator
    }

    if (authState is AuthUnauthenticated) {
      // Redirect splash to login (onboarding happens after register).
      if (currentPath == '/splash') {
        return '/login';
      }
      return isPublicRoute ? null : '/login';
    }

    if (authState is AuthAuthenticated) {
      // If on a public route, redirect to home based on role.
      if (isPublicRoute) {
        if (authState.isStaff) {
          // Check if staff has store assigned.
          if (authState.storeId == null || authState.storeId!.isEmpty) {
            return '/staff/no-store';
          }
          return '/staff/orders';
        }
        return '/home';
      }

      // Prevent customer from accessing staff routes and vice versa.
      if (currentPath.startsWith('/staff') && !authState.isStaff) {
        return '/home';
      }
      if (!currentPath.startsWith('/staff') &&
          authState.isStaff &&
          !currentPath.startsWith('/login')) {
        // Staff can only access staff routes.
        return '/staff/orders';
      }

      return null; // Allow navigation.
    }

    return null;
  }
}

/// Converts a BLoC stream into a Listenable for GoRouter refresh.
/// Debounces rapid state changes to avoid cascading re-evaluations.
class GoRouterRefreshStream extends ChangeNotifier {
  Timer? _debounce;

  GoRouterRefreshStream(Stream stream) {
    stream.listen((_) {
      // Debounce: wait 150ms of silence before refreshing the router.
      _debounce?.cancel();
      _debounce = Timer(const Duration(milliseconds: 150), () {
        notifyListeners();
      });
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }
}

/// Customer bottom navigation shell.
class _CustomerShell extends StatelessWidget {
  final Widget child;
  const _CustomerShell({required this.child});

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(context);
    return Scaffold(
      body: child,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: SizedBox(
        width: 50,
        height: 50,
        child: FloatingActionButton(
          onPressed: () => _onTabTapped(context, 2),
          elevation: 4,
          shape: const CircleBorder(),
          backgroundColor: AppColors.primary,
          child: const Icon(Icons.shopping_cart, color: Colors.white, size: 24),
        ),
      ),
      bottomNavigationBar: BottomAppBar(
        height: 54,
        color: AppColors.primary,
        shape: const CircularNotchedRectangle(),
        notchMargin: 8.0,
        elevation: 8,
        padding: EdgeInsets.zero,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildNavItem(context, 0, Icons.home_outlined, Icons.home, currentIndex),
            _buildNavItem(context, 1, Icons.restaurant_menu_outlined, Icons.restaurant_menu, currentIndex),
            
            // Spacer for the center FAB
            const SizedBox(width: 48),
            
            _buildNavItem(context, 3, Icons.receipt_long_outlined, Icons.receipt_long, currentIndex),
            _buildNavItem(context, 4, Icons.person_outline, Icons.person, currentIndex),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context,
    int index,
    IconData icon,
    IconData selectedIcon,
    int currentIndex,
  ) {
    final isSelected = index == currentIndex;
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _onTabTapped(context, index),
          customBorder: const CircleBorder(),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isSelected ? selectedIcon : icon,
                color: Colors.white.withValues(alpha: isSelected ? 1.0 : 0.65),
                size: 26,
              ),
              const SizedBox(height: 2),
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: isSelected ? 4 : 0,
                height: 4,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/menu')) return 1;
    if (location.startsWith('/cart')) return 2;
    if (location.startsWith('/orders')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  void _onTabTapped(BuildContext context, int index) {
    switch (index) {
      case 0: context.go('/home'); break;
      case 1: context.go('/menu'); break;
      case 2: context.go('/cart'); break;
      case 3: context.go('/orders'); break;
      case 4: context.go('/profile'); break;
    }
  }
}

/// Staff bottom navigation shell.
class _StaffShell extends StatelessWidget {
  final Widget child;
  const _StaffShell({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: AppColors.divider, width: 1),
          ),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex(context),
          onDestinationSelected: (index) => _onTabTapped(context, index),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Đơn hàng'),
            NavigationDestination(icon: Icon(Icons.delivery_dining_outlined), selectedIcon: Icon(Icons.delivery_dining), label: 'Giao hàng'),
            NavigationDestination(icon: Icon(Icons.menu_book_outlined), selectedIcon: Icon(Icons.menu_book), label: 'Thực đơn'),
            NavigationDestination(icon: Icon(Icons.chat_outlined), selectedIcon: Icon(Icons.chat), label: 'Hỗ trợ'),
            NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Cài đặt'),
          ],
        ),
      ),
    );
  }

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    if (location.startsWith('/staff/delivery')) return 1;
    if (location.startsWith('/staff/menu')) return 2;
    if (location.startsWith('/staff/chat')) return 3;
    if (location.startsWith('/staff/settings')) return 4;
    return 0;
  }

  void _onTabTapped(BuildContext context, int index) {
    switch (index) {
      case 0: context.go('/staff/orders'); break;
      case 1: context.go('/staff/delivery'); break;
      case 2: context.go('/staff/menu'); break;
      case 3: context.go('/staff/chat'); break;
      case 4: context.go('/staff/settings'); break;
    }
  }
}

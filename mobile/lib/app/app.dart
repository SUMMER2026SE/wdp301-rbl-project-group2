import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/app/routes/app_router.dart';
import 'package:foa_mobile/core/theme/app_theme.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/core/di/injection.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_cubit.dart';
import 'package:foa_mobile/features/cart/presentation/blocs/cart_cubit.dart';

// Import Staff Blocs
import 'package:foa_mobile/features/staff_orders/presentation/blocs/staff_orders_bloc.dart';
import 'package:foa_mobile/features/staff_delivery/presentation/blocs/staff_delivery_bloc.dart';
import 'package:foa_mobile/features/staff_menu/presentation/blocs/staff_menu_bloc.dart';
import 'package:foa_mobile/features/staff_chat/presentation/blocs/staff_chat_bloc.dart';
import 'package:foa_mobile/features/staff_customers/presentation/blocs/staff_customers_bloc.dart';

/// Root application widget.
/// Provides global BLoC providers, theme, and GoRouter.
class App extends StatefulWidget {
  const App({super.key});

  @override
  State<App> createState() => _AppState();
}

class _AppState extends State<App> with WidgetsBindingObserver {
  late final AuthBloc _authBloc;
  late final AppRouter _appRouter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _authBloc = sl<AuthBloc>();
    _appRouter = AppRouter(authBloc: _authBloc);

    // Trigger auth check on startup.
    _authBloc.add(const AuthCheckRequested());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        // App returns to foreground → reconnect socket if needed.
        SocketService().reconnectIfNeeded();
        break;
      case AppLifecycleState.paused:
        // App goes to background — let OS decide when to kill socket.
        break;
      default:
        break;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authBloc.close();
    SocketService().disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>.value(value: _authBloc),
        BlocProvider<StoreCubit>(
          create: (context) => sl<StoreCubit>()
            ..hydrateStore()
            ..fetchStores(),
        ),
        BlocProvider<CartCubit>(
          create: (context) => sl<CartCubit>()..loadCart(),
        ),
        // Add Staff Blocs globally to share states and socket listeners
        BlocProvider<StaffOrdersBloc>(
          create: (context) => sl<StaffOrdersBloc>(),
        ),

        BlocProvider<StaffDeliveryBloc>(
          create: (context) => sl<StaffDeliveryBloc>(),
        ),
        BlocProvider<StaffMenuBloc>(create: (context) => sl<StaffMenuBloc>()),
        BlocProvider<StaffChatBloc>(create: (context) => sl<StaffChatBloc>()),
        BlocProvider<StaffCustomersBloc>(
          create: (context) => sl<StaffCustomersBloc>(),
        ),
      ],
      child: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthAuthenticated) {
            context.read<CartCubit>().loadCart();
          }
        },
        child: MaterialApp.router(
          title: 'FoodieDash',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          routerConfig: _appRouter.router,
        ),
      ),
    );
  }
}

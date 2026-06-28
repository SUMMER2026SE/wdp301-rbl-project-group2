import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';
import 'package:foa_mobile/app/routes/app_router.dart';
import 'package:foa_mobile/core/theme/app_theme.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/core/di/injection.dart';

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
      ],
      child: MaterialApp.router(
        title: 'FoodieDash',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        routerConfig: _appRouter.router,
      ),
    );
  }
}

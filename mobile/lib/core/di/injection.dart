import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';
import 'package:foa_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:foa_mobile/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:foa_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:foa_mobile/features/auth/domain/usecases/login_usecase.dart';
import 'package:foa_mobile/features/auth/domain/usecases/register_usecase.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';

/// Global service locator instance.
final sl = GetIt.instance;

/// Register all dependencies.
/// Call once at app startup before runApp().
Future<void> initDependencies() async {
  // ── Local Storage (must init before anything reads SharedPreferences) ──
  await LocalStorage.init();

  // ── Core Services ──
  sl.registerLazySingleton<ApiClient>(() => ApiClient());
  sl.registerLazySingleton<Dio>(() => sl<ApiClient>().dio);
  sl.registerLazySingleton<SocketService>(() => SocketService());

  // ── Auth Feature ──
  // Data layer
  sl.registerLazySingleton<AuthRemoteDataSource>(() => AuthRemoteDataSource());
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(sl<AuthRemoteDataSource>()),
  );

  // Domain layer
  sl.registerLazySingleton<LoginUseCase>(() => LoginUseCase(sl<AuthRepository>()));
  sl.registerLazySingleton<RegisterUseCase>(() => RegisterUseCase(sl<AuthRepository>()));

  // ── App BLoCs ──
  sl.registerLazySingleton<AuthBloc>(
    () => AuthBloc(authRepository: sl<AuthRepository>()),
  );
}

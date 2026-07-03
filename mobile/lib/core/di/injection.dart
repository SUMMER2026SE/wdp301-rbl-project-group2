import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/services/socket_service.dart';
import 'package:foa_mobile/core/storage/local_storage.dart';

// Auth Feature
import 'package:foa_mobile/features/auth/data/datasources/auth_remote_datasource.dart';
import 'package:foa_mobile/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:foa_mobile/features/auth/domain/repositories/auth_repository.dart';
import 'package:foa_mobile/features/auth/domain/usecases/login_usecase.dart';
import 'package:foa_mobile/features/auth/domain/usecases/register_usecase.dart';
import 'package:foa_mobile/app/app_blocs/auth/auth_bloc.dart';

// Stores Feature
import 'package:foa_mobile/features/stores/data/datasources/store_remote_datasource.dart';
import 'package:foa_mobile/features/stores/presentation/cubit/store_cubit.dart';

// Products Feature
import 'package:foa_mobile/features/products/data/datasources/product_remote_datasource.dart';
import 'package:foa_mobile/features/products/data/repositories/product_repository_impl.dart';
import 'package:foa_mobile/features/products/domain/repositories/product_repository.dart';

// Staff Orders Feature
import 'package:foa_mobile/features/staff_orders/data/datasources/staff_orders_remote_datasource.dart';
import 'package:foa_mobile/features/staff_orders/data/repositories/staff_orders_repository_impl.dart';
import 'package:foa_mobile/features/staff_orders/domain/repositories/staff_orders_repository.dart';
import 'package:foa_mobile/features/staff_orders/domain/usecases/get_staff_orders.dart';
import 'package:foa_mobile/features/staff_orders/domain/usecases/get_staff_order_by_id.dart';
import 'package:foa_mobile/features/staff_orders/domain/usecases/update_staff_order_status.dart';
import 'package:foa_mobile/features/staff_orders/presentation/blocs/staff_orders_bloc.dart';

// Staff Delivery Feature
import 'package:foa_mobile/features/staff_delivery/data/datasources/staff_delivery_remote_datasource.dart';
import 'package:foa_mobile/features/staff_delivery/data/repositories/staff_delivery_repository_impl.dart';
import 'package:foa_mobile/features/staff_delivery/domain/repositories/staff_delivery_repository.dart';
import 'package:foa_mobile/features/staff_delivery/domain/usecases/get_assigned_deliveries.dart';
import 'package:foa_mobile/features/staff_delivery/domain/usecases/update_delivery_status.dart';
import 'package:foa_mobile/features/staff_delivery/presentation/blocs/staff_delivery_bloc.dart';

// Staff Menu Feature
import 'package:foa_mobile/features/staff_menu/data/datasources/staff_menu_remote_datasource.dart';
import 'package:foa_mobile/features/staff_menu/data/repositories/staff_menu_repository_impl.dart';
import 'package:foa_mobile/features/staff_menu/domain/repositories/staff_menu_repository.dart';
import 'package:foa_mobile/features/staff_menu/domain/usecases/get_store_products.dart';
import 'package:foa_mobile/features/staff_menu/domain/usecases/get_categories.dart';
import 'package:foa_mobile/features/staff_menu/domain/usecases/update_product_availability.dart';
import 'package:foa_mobile/features/staff_menu/presentation/blocs/staff_menu_bloc.dart';

// Staff Chat Feature
import 'package:foa_mobile/features/staff_chat/data/datasources/staff_chat_remote_datasource.dart';
import 'package:foa_mobile/features/staff_chat/data/repositories/staff_chat_repository_impl.dart';
import 'package:foa_mobile/features/staff_chat/domain/repositories/staff_chat_repository.dart';
import 'package:foa_mobile/features/staff_chat/domain/usecases/get_conversations.dart';
import 'package:foa_mobile/features/staff_chat/domain/usecases/get_conversation_messages.dart';
import 'package:foa_mobile/features/staff_chat/domain/usecases/chat_actions.dart';
import 'package:foa_mobile/features/staff_chat/presentation/blocs/staff_chat_bloc.dart';

// Staff Customers Feature
import 'package:foa_mobile/features/staff_customers/data/datasources/staff_customers_remote_datasource.dart';
import 'package:foa_mobile/features/staff_customers/data/repositories/staff_customers_repository_impl.dart';
import 'package:foa_mobile/features/staff_customers/domain/repositories/staff_customers_repository.dart';
import 'package:foa_mobile/features/staff_customers/domain/usecases/get_customers.dart';
import 'package:foa_mobile/features/staff_customers/domain/usecases/get_customer_details.dart';
import 'package:foa_mobile/features/staff_customers/presentation/blocs/staff_customers_bloc.dart';

// Menu Feature
import 'package:foa_mobile/features/menu/domain/usecases/get_menu_products.dart';
import 'package:foa_mobile/features/menu/domain/usecases/get_menu_categories.dart';
import 'package:foa_mobile/features/menu/presentation/blocs/menu_bloc.dart';

/// Global service locator instance.
final sl = GetIt.instance;

/// Register all dependencies.
/// Call once at app startup before runApp().
Future<void> initDependencies() async {
  // ── Local Storage ──
  await LocalStorage.init();

  // ── Core Services ──
  sl.registerLazySingleton<ApiClient>(() => ApiClient());
  sl.registerLazySingleton<Dio>(() => sl<ApiClient>().dio);
  sl.registerLazySingleton<SocketService>(() => SocketService());

  // ── Auth Feature ──
  sl.registerLazySingleton<AuthRemoteDataSource>(() => AuthRemoteDataSource());
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(sl<AuthRemoteDataSource>()),
  );
  sl.registerLazySingleton<LoginUseCase>(
    () => LoginUseCase(sl<AuthRepository>()),
  );
  sl.registerLazySingleton<RegisterUseCase>(
    () => RegisterUseCase(sl<AuthRepository>()),
  );
  sl.registerLazySingleton<AuthBloc>(
    () => AuthBloc(authRepository: sl<AuthRepository>()),
  );

  // ── Stores Feature ──
  sl.registerLazySingleton<StoreRemoteDataSource>(
    () => StoreRemoteDataSource(),
  );
  sl.registerLazySingleton<StoreCubit>(
    () => StoreCubit(sl<StoreRemoteDataSource>()),
  );

  // ── Products Feature ──
  sl.registerLazySingleton<ProductRemoteDataSource>(
    () => ProductRemoteDataSource(),
  );
  sl.registerLazySingleton<ProductRepository>(
    () => ProductRepositoryImpl(sl<ProductRemoteDataSource>()),
  );

  // ── Staff Orders Feature ──
  sl.registerLazySingleton<StaffOrdersRemoteDataSource>(
    () => StaffOrdersRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<StaffOrdersRepository>(
    () => StaffOrdersRepositoryImpl(sl<StaffOrdersRemoteDataSource>()),
  );
  sl.registerLazySingleton<GetStaffOrdersUseCase>(
    () => GetStaffOrdersUseCase(sl<StaffOrdersRepository>()),
  );
  sl.registerLazySingleton<GetStaffOrderByIdUseCase>(
    () => GetStaffOrderByIdUseCase(sl<StaffOrdersRepository>()),
  );
  sl.registerLazySingleton<ConfirmStaffOrderUseCase>(
    () => ConfirmStaffOrderUseCase(sl<StaffOrdersRepository>()),
  );
  sl.registerLazySingleton<RejectStaffOrderUseCase>(
    () => RejectStaffOrderUseCase(sl<StaffOrdersRepository>()),
  );
  sl.registerLazySingleton<ReadyStaffOrderUseCase>(
    () => ReadyStaffOrderUseCase(sl<StaffOrdersRepository>()),
  );
  sl.registerFactory<StaffOrdersBloc>(
    () => StaffOrdersBloc(
      getStaffOrdersUseCase: sl<GetStaffOrdersUseCase>(),
      confirmStaffOrderUseCase: sl<ConfirmStaffOrderUseCase>(),
      rejectStaffOrderUseCase: sl<RejectStaffOrderUseCase>(),
      readyStaffOrderUseCase: sl<ReadyStaffOrderUseCase>(),
    ),
  );

  // ── Staff Delivery Feature ──
  sl.registerLazySingleton<StaffDeliveryRemoteDataSource>(
    () => StaffDeliveryRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<StaffDeliveryRepository>(
    () => StaffDeliveryRepositoryImpl(sl<StaffDeliveryRemoteDataSource>()),
  );
  sl.registerLazySingleton<GetAssignedDeliveriesUseCase>(
    () => GetAssignedDeliveriesUseCase(sl<StaffDeliveryRepository>()),
  );
  sl.registerLazySingleton<AssignDeliveryUseCase>(
    () => AssignDeliveryUseCase(sl<StaffDeliveryRepository>()),
  );
  sl.registerLazySingleton<CompleteDeliveryUseCase>(
    () => CompleteDeliveryUseCase(sl<StaffDeliveryRepository>()),
  );
  sl.registerFactory<StaffDeliveryBloc>(
    () => StaffDeliveryBloc(
      getAssignedDeliveriesUseCase: sl<GetAssignedDeliveriesUseCase>(),
      assignDeliveryUseCase: sl<AssignDeliveryUseCase>(),
      completeDeliveryUseCase: sl<CompleteDeliveryUseCase>(),
    ),
  );

  // ── Staff Menu Feature ──
  sl.registerLazySingleton<StaffMenuRemoteDataSource>(
    () => StaffMenuRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<StaffMenuRepository>(
    () => StaffMenuRepositoryImpl(sl<StaffMenuRemoteDataSource>()),
  );
  sl.registerLazySingleton<GetStoreProductsUseCase>(
    () => GetStoreProductsUseCase(sl<StaffMenuRepository>()),
  );
  sl.registerLazySingleton<GetCategoriesUseCase>(
    () => GetCategoriesUseCase(sl<StaffMenuRepository>()),
  );
  sl.registerLazySingleton<UpdateProductAvailabilityUseCase>(
    () => UpdateProductAvailabilityUseCase(sl<StaffMenuRepository>()),
  );
  sl.registerFactory<StaffMenuBloc>(
    () => StaffMenuBloc(
      getStoreProductsUseCase: sl<GetStoreProductsUseCase>(),
      getCategoriesUseCase: sl<GetCategoriesUseCase>(),
      updateProductAvailabilityUseCase: sl<UpdateProductAvailabilityUseCase>(),
    ),
  );

  // ── Staff Chat Feature ──
  sl.registerLazySingleton<StaffChatRemoteDataSource>(
    () => StaffChatRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<StaffChatRepository>(
    () => StaffChatRepositoryImpl(sl<StaffChatRemoteDataSource>()),
  );
  sl.registerLazySingleton<GetConversationsUseCase>(
    () => GetConversationsUseCase(sl<StaffChatRepository>()),
  );
  sl.registerLazySingleton<GetConversationMessagesUseCase>(
    () => GetConversationMessagesUseCase(sl<StaffChatRepository>()),
  );
  sl.registerLazySingleton<SendChatMessageUseCase>(
    () => SendChatMessageUseCase(sl<StaffChatRepository>()),
  );
  sl.registerLazySingleton<UploadChatImageUseCase>(
    () => UploadChatImageUseCase(sl<StaffChatRepository>()),
  );
  sl.registerLazySingleton<CloseConversationUseCase>(
    () => CloseConversationUseCase(sl<StaffChatRepository>()),
  );
  sl.registerFactory<StaffChatBloc>(
    () => StaffChatBloc(
      getConversationsUseCase: sl<GetConversationsUseCase>(),
      getConversationMessagesUseCase: sl<GetConversationMessagesUseCase>(),
      sendChatMessageUseCase: sl<SendChatMessageUseCase>(),
      uploadChatImageUseCase: sl<UploadChatImageUseCase>(),
      closeConversationUseCase: sl<CloseConversationUseCase>(),
    ),
  );

  // ── Staff Customers Feature ──
  sl.registerLazySingleton<StaffCustomersRemoteDataSource>(
    () => StaffCustomersRemoteDataSourceImpl(sl<ApiClient>()),
  );
  sl.registerLazySingleton<StaffCustomersRepository>(
    () => StaffCustomersRepositoryImpl(sl<StaffCustomersRemoteDataSource>()),
  );
  sl.registerLazySingleton<GetCustomersUseCase>(
    () => GetCustomersUseCase(sl<StaffCustomersRepository>()),
  );
  sl.registerLazySingleton<GetCustomerDetailsUseCase>(
    () => GetCustomerDetailsUseCase(sl<StaffCustomersRepository>()),
  );
  sl.registerFactory<StaffCustomersBloc>(
    () => StaffCustomersBloc(
      getCustomersUseCase: sl<GetCustomersUseCase>(),
      getCustomerDetailsUseCase: sl<GetCustomerDetailsUseCase>(),
    ),
  );

  // ── Menu Feature ──
  sl.registerLazySingleton<GetMenuProductsUseCase>(
    () => GetMenuProductsUseCase(sl<ProductRepository>()),
  );
  sl.registerLazySingleton<GetMenuCategoriesUseCase>(
    () => GetMenuCategoriesUseCase(sl<ProductRepository>()),
  );
  sl.registerFactory<MenuBloc>(
    () => MenuBloc(
      getMenuProductsUseCase: sl<GetMenuProductsUseCase>(),
      getMenuCategoriesUseCase: sl<GetMenuCategoriesUseCase>(),
    ),
  );
}

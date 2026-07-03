import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_customers/domain/usecases/get_customers.dart';
import 'package:foa_mobile/features/staff_customers/domain/usecases/get_customer_details.dart';

// ── Events ──
abstract class StaffCustomersEvent extends Equatable {
  const StaffCustomersEvent();

  @override
  List<Object?> get props => [];
}

class SearchCustomersEvent extends StaffCustomersEvent {
  final String? query;
  final String? storeId;
  final int page;
  final int limit;
  final bool append;

  const SearchCustomersEvent({
    this.query,
    this.storeId,
    this.page = 1,
    this.limit = 20,
    this.append = false,
  });

  @override
  List<Object?> get props => [query, storeId, page, limit, append];
}

class LoadCustomerDetailsEvent extends StaffCustomersEvent {
  final String customerId;

  const LoadCustomerDetailsEvent({required this.customerId});

  @override
  List<Object?> get props => [customerId];
}

// ── States ──
abstract class StaffCustomersState extends Equatable {
  const StaffCustomersState();

  @override
  List<Object?> get props => [];
}

class StaffCustomersInitial extends StaffCustomersState {
  const StaffCustomersInitial();
}

class CustomersSearchLoading extends StaffCustomersState {
  const CustomersSearchLoading();
}

class CustomersSearchLoaded extends StaffCustomersState {
  final List<UserModel> customers;
  final String? query;
  final int page;
  final bool hasMore;
  final bool isLoadingMore;

  const CustomersSearchLoaded(
    this.customers, {
    this.query,
    this.page = 1,
    this.hasMore = true,
    this.isLoadingMore = false,
  });

  CustomersSearchLoaded copyWith({
    List<UserModel>? customers,
    String? query,
    int? page,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return CustomersSearchLoaded(
      customers ?? this.customers,
      query: query ?? this.query,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [customers, query, page, hasMore, isLoadingMore];
}

class CustomersSearchError extends StaffCustomersState {
  final String message;

  const CustomersSearchError(this.message);

  @override
  List<Object?> get props => [message];
}

class CustomerDetailsLoading extends StaffCustomersState {
  const CustomerDetailsLoading();
}

class CustomerDetailsLoaded extends StaffCustomersState {
  final UserModel customer;
  final List<OrderModel> orders;

  const CustomerDetailsLoaded({required this.customer, required this.orders});

  @override
  List<Object?> get props => [customer, orders];
}

class CustomerDetailsError extends StaffCustomersState {
  final String message;

  const CustomerDetailsError(this.message);

  @override
  List<Object?> get props => [message];
}

// ── BLoC ──
class StaffCustomersBloc
    extends Bloc<StaffCustomersEvent, StaffCustomersState> {
  final GetCustomersUseCase _getCustomersUseCase;
  final GetCustomerDetailsUseCase _getCustomerDetailsUseCase;

  StaffCustomersBloc({
    required GetCustomersUseCase getCustomersUseCase,
    required GetCustomerDetailsUseCase getCustomerDetailsUseCase,
  }) : _getCustomersUseCase = getCustomersUseCase,
       _getCustomerDetailsUseCase = getCustomerDetailsUseCase,
       super(const StaffCustomersInitial()) {
    on<SearchCustomersEvent>(_onSearch);
    on<LoadCustomerDetailsEvent>(_onLoadDetail);
  }

  Future<void> _onSearch(
    SearchCustomersEvent event,
    Emitter<StaffCustomersState> emit,
  ) async {
    final currentState = state;
    if (event.append && currentState is CustomersSearchLoaded) {
      if (currentState.isLoadingMore || !currentState.hasMore) return;
      emit(currentState.copyWith(isLoadingMore: true));
    } else {
      emit(const CustomersSearchLoading());
    }

    final result = await _getCustomersUseCase(
      search: event.query,
      storeId: event.storeId,
      page: event.page,
      limit: event.limit,
    );

    result.fold(
      (failure) {
        if (event.append && currentState is CustomersSearchLoaded) {
          emit(currentState.copyWith(isLoadingMore: false));
        } else {
          emit(CustomersSearchError(failure.message));
        }
      },
      (customers) {
        final merged = event.append && currentState is CustomersSearchLoaded
            ? [...currentState.customers, ...customers]
            : customers;
        emit(
          CustomersSearchLoaded(
            merged,
            query: event.query,
            page: event.page,
            hasMore: customers.length >= event.limit,
            isLoadingMore: false,
          ),
        );
      },
    );
  }

  Future<void> _onLoadDetail(
    LoadCustomerDetailsEvent event,
    Emitter<StaffCustomersState> emit,
  ) async {
    emit(const CustomerDetailsLoading());

    final result = await _getCustomerDetailsUseCase(
      customerId: event.customerId,
    );

    result.fold(
      (failure) => emit(CustomerDetailsError(failure.message)),
      (data) => emit(
        CustomerDetailsLoaded(customer: data.customer, orders: data.orders),
      ),
    );
  }
}

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

  const SearchCustomersEvent({this.query});

  @override
  List<Object?> get props => [query];
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

  const CustomersSearchLoaded(this.customers);

  @override
  List<Object?> get props => [customers];
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
    emit(const CustomersSearchLoading());

    final result = await _getCustomersUseCase(search: event.query);

    result.fold(
      (failure) => emit(CustomersSearchError(failure.message)),
      (customers) => emit(CustomersSearchLoaded(customers)),
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

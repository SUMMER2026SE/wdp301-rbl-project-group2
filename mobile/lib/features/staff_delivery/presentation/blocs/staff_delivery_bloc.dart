import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/features/staff_delivery/domain/usecases/get_assigned_deliveries.dart';
import 'package:foa_mobile/features/staff_delivery/domain/usecases/update_delivery_status.dart';

// ── Events ──
abstract class StaffDeliveryEvent extends Equatable {
  const StaffDeliveryEvent();

  @override
  List<Object?> get props => [];
}

class FetchAssignedDeliveriesEvent extends StaffDeliveryEvent {
  final String storeId;
  final String driverId;
  final bool showLoader;

  const FetchAssignedDeliveriesEvent({
    required this.storeId,
    required this.driverId,
    this.showLoader = true,
  });

  @override
  List<Object?> get props => [storeId, driverId, showLoader];
}

class AssignDeliveryEvent extends StaffDeliveryEvent {
  final String orderId;
  final String storeId;
  final String driverId; // to refetch list on success

  const AssignDeliveryEvent({
    required this.orderId,
    required this.storeId,
    required this.driverId,
  });

  @override
  List<Object?> get props => [orderId, storeId, driverId];
}

class CompleteDeliveryEvent extends StaffDeliveryEvent {
  final String orderId;
  final String storeId;
  final String driverId;

  const CompleteDeliveryEvent({
    required this.orderId,
    required this.storeId,
    required this.driverId,
  });

  @override
  List<Object?> get props => [orderId, storeId, driverId];
}

// ── States ──
abstract class StaffDeliveryState extends Equatable {
  const StaffDeliveryState();

  @override
  List<Object?> get props => [];
}

class StaffDeliveryInitial extends StaffDeliveryState {
  const StaffDeliveryInitial();
}

class StaffDeliveryLoading extends StaffDeliveryState {
  const StaffDeliveryLoading();
}

class StaffDeliveryLoaded extends StaffDeliveryState {
  final List<OrderModel> deliveries;
  final String? actioningOrderId;
  final String? message;

  const StaffDeliveryLoaded({
    required this.deliveries,
    this.actioningOrderId,
    this.message,
  });

  StaffDeliveryLoaded copyWith({
    List<OrderModel>? deliveries,
    String? actioningOrderId,
    String? message,
  }) {
    return StaffDeliveryLoaded(
      deliveries: deliveries ?? this.deliveries,
      actioningOrderId: actioningOrderId,
      message: message,
    );
  }

  @override
  List<Object?> get props => [deliveries, actioningOrderId, message];
}

class StaffDeliveryError extends StaffDeliveryState {
  final String message;

  const StaffDeliveryError(this.message);

  @override
  List<Object?> get props => [message];
}

// ── BLoC ──
class StaffDeliveryBloc extends Bloc<StaffDeliveryEvent, StaffDeliveryState> {
  final GetAssignedDeliveriesUseCase _getAssignedDeliveriesUseCase;
  final AssignDeliveryUseCase _assignDeliveryUseCase;
  final CompleteDeliveryUseCase _completeDeliveryUseCase;

  StaffDeliveryBloc({
    required GetAssignedDeliveriesUseCase getAssignedDeliveriesUseCase,
    required AssignDeliveryUseCase assignDeliveryUseCase,
    required CompleteDeliveryUseCase completeDeliveryUseCase,
  }) : _getAssignedDeliveriesUseCase = getAssignedDeliveriesUseCase,
       _assignDeliveryUseCase = assignDeliveryUseCase,
       _completeDeliveryUseCase = completeDeliveryUseCase,
       super(const StaffDeliveryInitial()) {
    on<FetchAssignedDeliveriesEvent>(_onFetchDeliveries);
    on<AssignDeliveryEvent>(_onAssignDelivery);
    on<CompleteDeliveryEvent>(_onCompleteDelivery);
  }

  Future<void> _onFetchDeliveries(
    FetchAssignedDeliveriesEvent event,
    Emitter<StaffDeliveryState> emit,
  ) async {
    if (event.showLoader) {
      emit(const StaffDeliveryLoading());
    }

    final result = await _getAssignedDeliveriesUseCase(
      storeId: event.storeId,
      driverId: event.driverId,
    );

    result.fold(
      (failure) => emit(StaffDeliveryError(failure.message)),
      (deliveries) => emit(StaffDeliveryLoaded(deliveries: deliveries)),
    );
  }

  Future<void> _onAssignDelivery(
    AssignDeliveryEvent event,
    Emitter<StaffDeliveryState> emit,
  ) async {
    final currentState = state;
    if (currentState is StaffDeliveryLoaded) {
      emit(currentState.copyWith(actioningOrderId: event.orderId));
    }

    final result = await _assignDeliveryUseCase(
      orderId: event.orderId,
      storeId: event.storeId,
    );

    result.fold(
      (failure) {
        if (currentState is StaffDeliveryLoaded) {
          emit(currentState.copyWith(message: failure.message));
        } else {
          emit(StaffDeliveryError(failure.message));
        }
      },
      (_) {
        // Automatically fetch delivery list again to add the newly assigned order
        add(
          FetchAssignedDeliveriesEvent(
            storeId: event.storeId,
            driverId: event.driverId,
            showLoader: false,
          ),
        );
      },
    );
  }

  Future<void> _onCompleteDelivery(
    CompleteDeliveryEvent event,
    Emitter<StaffDeliveryState> emit,
  ) async {
    final currentState = state;
    if (currentState is! StaffDeliveryLoaded) return;

    emit(currentState.copyWith(actioningOrderId: event.orderId));

    final result = await _completeDeliveryUseCase(
      orderId: event.orderId,
      storeId: event.storeId,
    );

    result.fold(
      (failure) => emit(currentState.copyWith(message: failure.message)),
      (_) {
        // Remove locally or trigger reload
        final updatedList = currentState.deliveries
            .where((o) => o.id != event.orderId)
            .toList();
        emit(
          StaffDeliveryLoaded(
            deliveries: updatedList,
            message: 'Đã hoàn thành chuyến giao hàng thành công! 🎉',
          ),
        );
      },
    );
  }
}

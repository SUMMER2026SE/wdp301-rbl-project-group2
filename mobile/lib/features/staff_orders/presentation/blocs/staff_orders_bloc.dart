import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:foa_mobile/core/models/order_model.dart';
import 'package:foa_mobile/core/models/user_model.dart';
import 'package:foa_mobile/core/constants/order_status.dart';
import 'package:foa_mobile/features/staff_orders/domain/usecases/get_staff_orders.dart';
import 'package:foa_mobile/features/staff_orders/domain/usecases/update_staff_order_status.dart';

// ── Events ──
abstract class StaffOrdersEvent extends Equatable {
  const StaffOrdersEvent();

  @override
  List<Object?> get props => [];
}

class FetchStaffOrdersEvent extends StaffOrdersEvent {
  final String storeId;
  final String? status;
  final bool showLoader;

  const FetchStaffOrdersEvent({
    required this.storeId,
    this.status,
    this.showLoader = true,
  });

  @override
  List<Object?> get props => [storeId, status, showLoader];
}

class ConfirmOrderEvent extends StaffOrdersEvent {
  final String orderId;
  final String storeId;

  const ConfirmOrderEvent({required this.orderId, required this.storeId});

  @override
  List<Object?> get props => [orderId, storeId];
}

class RejectOrderEvent extends StaffOrdersEvent {
  final String orderId;
  final String storeId;
  final String reason;

  const RejectOrderEvent({
    required this.orderId,
    required this.storeId,
    required this.reason,
  });

  @override
  List<Object?> get props => [orderId, storeId, reason];
}

class ReadyOrderEvent extends StaffOrdersEvent {
  final String orderId;
  final String storeId;

  const ReadyOrderEvent({required this.orderId, required this.storeId});

  @override
  List<Object?> get props => [orderId, storeId];
}

class ReceiveNewOrderRealtimeEvent extends StaffOrdersEvent {
  final OrderModel order;

  const ReceiveNewOrderRealtimeEvent(this.order);

  @override
  List<Object?> get props => [order];
}

// ── States ──
abstract class StaffOrdersState extends Equatable {
  const StaffOrdersState();

  @override
  List<Object?> get props => [];
}

class StaffOrdersInitial extends StaffOrdersState {
  const StaffOrdersInitial();
}

class StaffOrdersLoading extends StaffOrdersState {
  const StaffOrdersLoading();
}

class StaffOrdersLoaded extends StaffOrdersState {
  final List<OrderModel> orders;
  final String? actioningOrderId; // Track which order is currently being updated
  final String? message;

  const StaffOrdersLoaded({
    required this.orders,
    this.actioningOrderId,
    this.message,
  });

  StaffOrdersLoaded copyWith({
    List<OrderModel>? orders,
    String? actioningOrderId,
    String? message,
  }) {
    return StaffOrdersLoaded(
      orders: orders ?? this.orders,
      actioningOrderId: actioningOrderId, // will reset if null passed
      message: message,
    );
  }

  @override
  List<Object?> get props => [orders, actioningOrderId, message];
}

class StaffOrdersError extends StaffOrdersState {
  final String message;

  const StaffOrdersError(this.message);

  @override
  List<Object?> get props => [message];
}

// ── BLoC ──
class StaffOrdersBloc extends Bloc<StaffOrdersEvent, StaffOrdersState> {
  final GetStaffOrdersUseCase _getStaffOrdersUseCase;
  final ConfirmStaffOrderUseCase _confirmStaffOrderUseCase;
  final RejectStaffOrderUseCase _rejectStaffOrderUseCase;
  final ReadyStaffOrderUseCase _readyStaffOrderUseCase;

  StaffOrdersBloc({
    required GetStaffOrdersUseCase getStaffOrdersUseCase,
    required ConfirmStaffOrderUseCase confirmStaffOrderUseCase,
    required RejectStaffOrderUseCase rejectStaffOrderUseCase,
    required ReadyStaffOrderUseCase readyStaffOrderUseCase,
  })  : _getStaffOrdersUseCase = getStaffOrdersUseCase,
        _confirmStaffOrderUseCase = confirmStaffOrderUseCase,
        _rejectStaffOrderUseCase = rejectStaffOrderUseCase,
        _readyStaffOrderUseCase = readyStaffOrderUseCase,
        super(const StaffOrdersInitial()) {
    on<FetchStaffOrdersEvent>(_onFetchOrders);
    on<ConfirmOrderEvent>(_onConfirmOrder);
    on<RejectOrderEvent>(_onRejectOrder);
    on<ReadyOrderEvent>(_onReadyOrder);
    on<ReceiveNewOrderRealtimeEvent>(_onReceiveNewOrderRealtime);
  }

  Future<void> _onFetchOrders(
    FetchStaffOrdersEvent event,
    Emitter<StaffOrdersState> emit,
  ) async {
    if (event.showLoader) {
      emit(const StaffOrdersLoading());
    }
    
    final result = await _getStaffOrdersUseCase(
      storeId: event.storeId,
      status: event.status,
    );

    result.fold(
      (failure) => emit(StaffOrdersError(failure.message)),
      (orders) => emit(StaffOrdersLoaded(orders: orders)),
    );
  }

  Future<void> _onConfirmOrder(
    ConfirmOrderEvent event,
    Emitter<StaffOrdersState> emit,
  ) async {
    final currentState = state;
    if (currentState is! StaffOrdersLoaded) return;

    emit(currentState.copyWith(actioningOrderId: event.orderId));

    final result = await _confirmStaffOrderUseCase(
      orderId: event.orderId,
      storeId: event.storeId,
    );

    result.fold(
      (failure) => emit(currentState.copyWith(message: failure.message)),
      (_) {
        // Optimistically update status locally or trigger fetch
        final updatedOrders = currentState.orders.map((o) {
          if (o.id == event.orderId) {
            return o.copyWith(status: 'confirmed'); // assuming copyWith is defined in OrderModel
          }
          return o;
        }).toList();
        
        emit(StaffOrdersLoaded(
          orders: updatedOrders,
          message: 'Đã xác nhận đơn hàng thành công!',
        ));
      },
    );
  }

  Future<void> _onRejectOrder(
    RejectOrderEvent event,
    Emitter<StaffOrdersState> emit,
  ) async {
    final currentState = state;
    if (currentState is! StaffOrdersLoaded) return;

    emit(currentState.copyWith(actioningOrderId: event.orderId));

    final result = await _rejectStaffOrderUseCase(
      orderId: event.orderId,
      storeId: event.storeId,
      reason: event.reason,
    );

    result.fold(
      (failure) => emit(currentState.copyWith(message: failure.message)),
      (_) {
        final updatedOrders = currentState.orders.map((o) {
          if (o.id == event.orderId) {
            return o.copyWith(status: 'cancelled');
          }
          return o;
        }).toList();

        emit(StaffOrdersLoaded(
          orders: updatedOrders,
          message: 'Đã từ chối đơn hàng.',
        ));
      },
    );
  }

  Future<void> _onReadyOrder(
    ReadyOrderEvent event,
    Emitter<StaffOrdersState> emit,
  ) async {
    final currentState = state;
    if (currentState is! StaffOrdersLoaded) return;

    emit(currentState.copyWith(actioningOrderId: event.orderId));

    final result = await _readyStaffOrderUseCase(
      orderId: event.orderId,
      storeId: event.storeId,
    );

    result.fold(
      (failure) => emit(currentState.copyWith(message: failure.message)),
      (_) {
        final updatedOrders = currentState.orders.map((o) {
          if (o.id == event.orderId) {
            return o.copyWith(status: 'ready_for_delivery');
          }
          return o;
        }).toList();

        emit(StaffOrdersLoaded(
          orders: updatedOrders,
          message: 'Đơn hàng đã chuẩn bị xong!',
        ));
      },
    );
  }

  void _onReceiveNewOrderRealtime(
    ReceiveNewOrderRealtimeEvent event,
    Emitter<StaffOrdersState> emit,
  ) {
    final currentState = state;
    if (currentState is StaffOrdersLoaded) {
      // Check if order already exists in current list to prevent duplicate insertion
      final exists = currentState.orders.any((o) => o.id == event.order.id);
      if (!exists) {
        final updatedList = [event.order, ...currentState.orders];
        emit(StaffOrdersLoaded(
          orders: updatedList,
          message: 'Có đơn hàng mới vừa được chuyển đến!',
        ));
      }
    }
  }
}

// Bổ sung helper method copyWith cho OrderModel để cập nhật trạng thái tiện lợi
extension OrderModelCopyWith on OrderModel {
  OrderModel copyWith({
    String? id,
    String? code,
    String? storeId,
    String? storeName,
    UserModel? customer,
    String? customerId,
    List<OrderItemModel>? items,
    String? note,
    List<String>? staffNoteItems,
    String? status, // String status for copyWith helper
    int? subTotal,
    int? shippingFee,
    int? totalPrice,
    OrderPaymentModel? payment,
    UserAddressModel? deliveryAddress,
    OrderDeliveryInfoModel? deliveryInfo,
    String? voucher,
    int? discountAmount,
    OrderCancellationModel? cancellation,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return OrderModel(
      id: id ?? this.id,
      code: code ?? this.code,
      storeId: storeId ?? this.storeId,
      storeName: storeName ?? this.storeName,
      customer: customer ?? this.customer,
      customerId: customerId ?? this.customerId,
      items: items ?? this.items,
      note: note ?? this.note,
      staffNoteItems: staffNoteItems ?? this.staffNoteItems,
      status: status != null ? OrderStatus.fromString(status) : this.status,
      subTotal: subTotal ?? this.subTotal,
      shippingFee: shippingFee ?? this.shippingFee,
      totalPrice: totalPrice ?? this.totalPrice,
      payment: payment ?? this.payment,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      deliveryInfo: deliveryInfo ?? this.deliveryInfo,
      voucher: voucher ?? this.voucher,
      discountAmount: discountAmount ?? this.discountAmount,
      cancellation: cancellation ?? this.cancellation,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

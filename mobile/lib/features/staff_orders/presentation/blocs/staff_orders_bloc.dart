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
  final int page;
  final int limit;
  final bool append;

  const FetchStaffOrdersEvent({
    required this.storeId,
    this.status,
    this.showLoader = true,
    this.page = 1,
    this.limit = 20,
    this.append = false,
  });

  @override
  List<Object?> get props => [storeId, status, showLoader, page, limit, append];
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
  final String?
  actioningOrderId; // Track which order is currently being updated
  final String? message;
  final int page;
  final bool hasMore;
  final bool isLoadingMore;

  const StaffOrdersLoaded({
    required this.orders,
    this.actioningOrderId,
    this.message,
    this.page = 1,
    this.hasMore = true,
    this.isLoadingMore = false,
  });

  StaffOrdersLoaded copyWith({
    List<OrderModel>? orders,
    String? actioningOrderId,
    String? message,
    int? page,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return StaffOrdersLoaded(
      orders: orders ?? this.orders,
      actioningOrderId: actioningOrderId,
      message: message,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [
    orders,
    actioningOrderId,
    message,
    page,
    hasMore,
    isLoadingMore,
  ];
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
  }) : _getStaffOrdersUseCase = getStaffOrdersUseCase,
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
    final currentState = state;

    if (event.append && currentState is StaffOrdersLoaded) {
      if (currentState.isLoadingMore || !currentState.hasMore) return;
      emit(currentState.copyWith(isLoadingMore: true, message: null));
    } else if (event.showLoader) {
      emit(const StaffOrdersLoading());
    }

    final result = await _getStaffOrdersUseCase(
      storeId: event.storeId,
      status: event.status,
      page: event.page,
      limit: event.limit,
    );

    result.fold(
      (failure) {
        if (event.append && currentState is StaffOrdersLoaded) {
          emit(
            currentState.copyWith(
              isLoadingMore: false,
              message: failure.message,
            ),
          );
        } else {
          emit(StaffOrdersError(failure.message));
        }
      },
      (orders) {
        final merged = event.append && currentState is StaffOrdersLoaded
            ? [...currentState.orders, ...orders]
            : orders;
        emit(
          StaffOrdersLoaded(
            orders: merged,
            page: event.page,
            hasMore: orders.length >= event.limit,
            isLoadingMore: false,
          ),
        );
      },
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
            return o.copyWith(
              status: 'confirmed',
            ); // assuming copyWith is defined in OrderModel
          }
          return o;
        }).toList();

        emit(
          currentState.copyWith(
            orders: updatedOrders,
            message: 'Đã xác nhận đơn hàng thành công!',
          ),
        );
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

        emit(
          currentState.copyWith(
            orders: updatedOrders,
            message: 'Đã từ chối đơn hàng.',
          ),
        );
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

        emit(
          currentState.copyWith(
            orders: updatedOrders,
            message: 'Đơn hàng đã chuẩn bị xong!',
          ),
        );
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
        emit(
          currentState.copyWith(
            orders: updatedList,
            message: 'Có đơn hàng mới vừa được chuyển đến!',
          ),
        );
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

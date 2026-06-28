/// Order status values matching backend enum.
enum OrderStatus {
  pending,
  confirmed,
  processing,
  preparing,
  readyForDelivery,
  shipping,
  delivering,
  delivered,
  completed,
  cancelled,
  refunded;

  /// Convert from backend string (e.g. 'ready_for_delivery').
  static OrderStatus fromString(String value) {
    switch (value) {
      case 'pending':
        return OrderStatus.pending;
      case 'confirmed':
        return OrderStatus.confirmed;
      case 'processing':
        return OrderStatus.processing;
      case 'preparing':
        return OrderStatus.preparing;
      case 'ready_for_delivery':
        return OrderStatus.readyForDelivery;
      case 'shipping':
        return OrderStatus.shipping;
      case 'delivering':
        return OrderStatus.delivering;
      case 'delivered':
        return OrderStatus.delivered;
      case 'completed':
        return OrderStatus.completed;
      case 'cancelled':
        return OrderStatus.cancelled;
      case 'refunded':
        return OrderStatus.refunded;
      default:
        return OrderStatus.pending;
    }
  }

  /// Convert to backend string.
  String toApiString() {
    switch (this) {
      case OrderStatus.readyForDelivery:
        return 'ready_for_delivery';
      default:
        return name;
    }
  }

  /// Human-readable Vietnamese label.
  String get label {
    switch (this) {
      case OrderStatus.pending:
        return 'Chờ xác nhận';
      case OrderStatus.confirmed:
        return 'Đã xác nhận';
      case OrderStatus.processing:
        return 'Đang xử lý';
      case OrderStatus.preparing:
        return 'Đang chuẩn bị';
      case OrderStatus.readyForDelivery:
        return 'Sẵn sàng giao';
      case OrderStatus.shipping:
        return 'Đang vận chuyển';
      case OrderStatus.delivering:
        return 'Đang giao hàng';
      case OrderStatus.delivered:
        return 'Đã giao';
      case OrderStatus.completed:
        return 'Hoàn thành';
      case OrderStatus.cancelled:
        return 'Đã hủy';
      case OrderStatus.refunded:
        return 'Đã hoàn tiền';
    }
  }

  /// Whether this is a terminal (final) status.
  bool get isTerminal =>
      this == OrderStatus.completed ||
      this == OrderStatus.cancelled ||
      this == OrderStatus.refunded;

  /// Whether this status is active (in-progress).
  bool get isActive => !isTerminal;

  /// Staff allowed transitions from this status.
  List<OrderStatus> get staffTransitions {
    switch (this) {
      case OrderStatus.pending:
        return [OrderStatus.confirmed, OrderStatus.cancelled];
      case OrderStatus.confirmed:
        return [OrderStatus.processing, OrderStatus.readyForDelivery, OrderStatus.preparing];
      case OrderStatus.processing:
        return [OrderStatus.readyForDelivery];
      case OrderStatus.preparing:
        return [OrderStatus.readyForDelivery, OrderStatus.delivering, OrderStatus.shipping];
      case OrderStatus.readyForDelivery:
        return [OrderStatus.shipping, OrderStatus.delivering];
      case OrderStatus.shipping:
        return [OrderStatus.delivered, OrderStatus.completed];
      case OrderStatus.delivering:
        return [OrderStatus.delivered, OrderStatus.completed];
      case OrderStatus.delivered:
        return [OrderStatus.completed];
      default:
        return [];
    }
  }
}

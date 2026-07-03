import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:foa_mobile/features/orders/presentation/pages/order_history_page.dart';

void main() {
  testWidgets('OrderHistoryPage renders status filter tabs', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OrderHistoryPage(fetchOnInit: false),
      ),
    );

    expect(find.text('Tất cả'), findsOneWidget);
    expect(find.text('Chờ xác nhận'), findsOneWidget);
    expect(find.text('Đang xử lý'), findsOneWidget);
    expect(find.text('Đã giao'), findsOneWidget);
    expect(find.text('Đã hủy'), findsOneWidget);
  });
}

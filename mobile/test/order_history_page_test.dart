import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:foa_mobile/features/orders/presentation/pages/order_history_page.dart';

void main() {
  testWidgets('OrderHistoryPage provides a TabController for status tabs', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: OrderHistoryPage(fetchOnInit: false),
      ),
    );

    expect(find.byType(TabBar), findsOneWidget);
  });
}

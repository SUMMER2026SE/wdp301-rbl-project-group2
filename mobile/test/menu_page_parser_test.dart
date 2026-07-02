import 'package:flutter_test/flutter_test.dart';
import 'package:foa_mobile/features/menu/presentation/pages/menu_page.dart';

void main() {
  test('parseMenuCategories accepts backend category strings', () {
    final categories = parseMenuCategories({
      'data': ['Cơm Đĩa Truyền Thống', 'Đặc Sản & Bán Chạy'],
    });

    expect(categories, [
      {'id': 'Cơm Đĩa Truyền Thống', 'name': 'Cơm Đĩa Truyền Thống'},
      {'id': 'Đặc Sản & Bán Chạy', 'name': 'Đặc Sản & Bán Chạy'},
    ]);
  });
}

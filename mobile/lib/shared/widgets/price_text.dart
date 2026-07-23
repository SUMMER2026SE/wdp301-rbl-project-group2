import 'package:flutter/material.dart';
import 'package:foa_mobile/core/utils/formatters.dart';

/// Styled price text widget with VND formatting.
class PriceText extends StatelessWidget {
  final num price;
  final double fontSize;
  final FontWeight fontWeight;
  final Color? color;
  final num? originalPrice; // For strikethrough original price

  const PriceText({
    super.key,
    required this.price,
    this.fontSize = 16,
    this.fontWeight = FontWeight.w600,
    this.color,
    this.originalPrice,
  });

  @override
  Widget build(BuildContext context) {
    final priceColor = color ?? Theme.of(context).colorScheme.primary;

    if (originalPrice != null && originalPrice! > price) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            Formatters.currency(price),
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: fontWeight,
              color: priceColor,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            Formatters.currency(originalPrice!),
            style: TextStyle(
              fontSize: fontSize * 0.8,
              fontWeight: FontWeight.w400,
              color: Colors.grey,
              decoration: TextDecoration.lineThrough,
            ),
          ),
        ],
      );
    }

    return Text(
      Formatters.currency(price),
      style: TextStyle(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: priceColor,
      ),
    );
  }
}

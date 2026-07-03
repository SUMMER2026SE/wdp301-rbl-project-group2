/// Pure domain entity for a single variant option (e.g. "Large", "Extra Cheese").
class VariantOptionEntity {
  final String choice;
  final double extraPrice;

  const VariantOptionEntity({required this.choice, this.extraPrice = 0.0});
}

/// Pure domain entity for a variant group (e.g. "Size", "Toppings").
class VariantGroupEntity {
  final String name;
  final bool required;
  final bool multiple;
  final int? maxChoices;
  final List<VariantOptionEntity> options;

  const VariantGroupEntity({
    required this.name,
    this.required = false,
    this.multiple = false,
    this.maxChoices,
    this.options = const [],
  });
}

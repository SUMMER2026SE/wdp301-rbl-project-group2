import 'package:foa_mobile/features/products/domain/entities/variant_entity.dart';

/// JSON-serializable variant option model.
class VariantOptionModel {
  final String choice;
  final double extraPrice;

  const VariantOptionModel({
    required this.choice,
    this.extraPrice = 0.0,
  });

  factory VariantOptionModel.fromJson(Map<String, dynamic> json) {
    return VariantOptionModel(
      choice: json['choice'] as String? ?? '',
      extraPrice: (json['extraPrice'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'choice': choice,
        'extraPrice': extraPrice,
      };

  VariantOptionEntity toEntity() => VariantOptionEntity(
        choice: choice,
        extraPrice: extraPrice,
      );
}

/// JSON-serializable variant group model.
class VariantGroupModel {
  final String name;
  final bool required;
  final bool multiple;
  final int? maxChoices;
  final List<VariantOptionModel> options;

  const VariantGroupModel({
    required this.name,
    this.required = false,
    this.multiple = false,
    this.maxChoices,
    this.options = const [],
  });

  factory VariantGroupModel.fromJson(Map<String, dynamic> json) {
    return VariantGroupModel(
      name: json['name'] as String? ?? '',
      required: json['required'] as bool? ?? false,
      multiple: json['multiple'] as bool? ?? false,
      maxChoices: json['maxChoices'] as int?,
      options: (json['options'] as List<dynamic>?)
              ?.map(
                  (e) => VariantOptionModel.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'name': name,
        'required': required,
        'multiple': multiple,
        'maxChoices': maxChoices,
        'options': options.map((o) => o.toJson()).toList(),
      };

  VariantGroupEntity toEntity() => VariantGroupEntity(
        name: name,
        required: required,
        multiple: multiple,
        maxChoices: maxChoices,
        options: options.map((o) => o.toEntity()).toList(),
      );
}

/// JSON-serializable membership model matching backend response.
class MembershipModel {
  final String tier; // bronze, silver, gold, diamond
  final int points;
  final int pointsToNextTier;
  final double discountRate;
  final List<String> benefits;

  const MembershipModel({
    required this.tier,
    this.points = 0,
    this.pointsToNextTier = 0,
    this.discountRate = 0.0,
    this.benefits = const [],
  });

  factory MembershipModel.fromJson(Map<String, dynamic> json) {
    return MembershipModel(
      tier: json['tier'] as String? ?? 'bronze',
      points: json['points'] as int? ?? 0,
      pointsToNextTier: json['pointsToNextTier'] as int? ?? 0,
      discountRate: (json['discountRate'] as num?)?.toDouble() ?? 0.0,
      benefits: (json['benefits'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'tier': tier,
        'points': points,
        'pointsToNextTier': pointsToNextTier,
        'discountRate': discountRate,
        'benefits': benefits,
      };
}

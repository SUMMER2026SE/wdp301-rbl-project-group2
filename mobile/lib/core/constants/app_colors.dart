import 'package:flutter/material.dart';

/// Application color palette — FoodieDash theme.
class AppColors {
  AppColors._();

  // ── Primary ──
  static const Color primary = Color(0xFFFF6B35);
  static const Color primaryLight = Color(0xFFFF8F5E);
  static const Color primaryDark = Color(0xFFE55A2B);

  // ── Secondary ──
  static const Color secondary = Color(0xFF2EC4B6);
  static const Color secondaryLight = Color(0xFF5ED4C9);
  static const Color secondaryDark = Color(0xFF1FA396);

  // ── Accent ──
  static const Color accent = Color(0xFFFFBF69);

  // ── Background ──
  static const Color background = Color(0xFFF8F9FA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF1F3F5);

  // ── Text ──
  static const Color textPrimary = Color(0xFF212529);
  static const Color textSecondary = Color(0xFF6C757D);
  static const Color textHint = Color(0xFFADB5BD);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // ── Status ──
  static const Color success = Color(0xFF28A745);
  static const Color warning = Color(0xFFFFC107);
  static const Color error = Color(0xFFDC3545);
  static const Color info = Color(0xFF17A2B8);

  // ── Order Status Colors ──
  static const Color statusPending = Color(0xFFFFC107);
  static const Color statusConfirmed = Color(0xFF17A2B8);
  static const Color statusPreparing = Color(0xFF6F42C1);
  static const Color statusReady = Color(0xFF20C997);
  static const Color statusDelivering = Color(0xFF0D6EFD);
  static const Color statusCompleted = Color(0xFF28A745);
  static const Color statusCancelled = Color(0xFFDC3545);

  // ── Misc ──
  static const Color divider = Color(0xFFDEE2E6);
  static const Color shadow = Color(0x1A000000);
  static const Color shimmerBase = Color(0xFFE9ECEF);
  static const Color shimmerHighlight = Color(0xFFF8F9FA);
  static const Color overlay = Color(0x80000000);
}

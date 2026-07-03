import 'package:flutter/material.dart';

/// Placeholder page for features not yet implemented.
class ComingSoonPage extends StatelessWidget {
  final String title;
  final String? description;
  final IconData icon;

  const ComingSoonPage({
    super.key,
    required this.title,
    this.description,
    this.icon = Icons.construction,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 80, color: Colors.grey[300]),
              const SizedBox(height: 24),
              Text(
                title,
                style: theme.textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              if (description != null) ...[
                const SizedBox(height: 12),
                Text(
                  description!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 16),
              Text('Đang phát triển...', style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }
}

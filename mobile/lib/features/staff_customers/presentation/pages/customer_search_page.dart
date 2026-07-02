import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:foa_mobile/core/constants/app_colors.dart';
import 'package:foa_mobile/core/utils/debouncer.dart';
import 'package:foa_mobile/features/staff_customers/presentation/blocs/staff_customers_bloc.dart';
import 'package:foa_mobile/shared/widgets/empty_state_widget.dart';

class CustomerSearchPage extends StatefulWidget {
  const CustomerSearchPage({super.key});

  @override
  State<CustomerSearchPage> createState() => _CustomerSearchPageState();
}

class _CustomerSearchPageState extends State<CustomerSearchPage> {
  final TextEditingController _searchController = TextEditingController();
  final Debouncer _debouncer = Debouncer(delay: const Duration(milliseconds: 300));
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
  }

  void _triggerSearch() {
    context.read<StaffCustomersBloc>().add(SearchCustomersEvent(
          query: _searchQuery.isEmpty ? null : _searchQuery,
        ));
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debouncer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Khách hàng'),
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              onChanged: (val) {
                setState(() {
                  _searchQuery = val.trim();
                });
                _debouncer.run(_triggerSearch);
              },
              decoration: InputDecoration(
                hintText: 'Nhập tên/email/số điện thoại để tìm kiếm',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                          });
                          _debouncer.run(_triggerSearch);
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.grey.shade100,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // Search Results
          Expanded(
            child: BlocBuilder<StaffCustomersBloc, StaffCustomersState>(
              builder: (context, state) {
                if (state is CustomersSearchLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (state is CustomersSearchError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.error),
                        const SizedBox(height: 16),
                        Text(state.message, style: const TextStyle(color: AppColors.error)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _triggerSearch,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  );
                }

                if (state is CustomersSearchLoaded) {
                  final customers = state.customers;

                  if (customers.isEmpty) {
                    return const EmptyStateWidget(
                      icon: Icons.person_search_outlined,
                      title: 'Không tìm thấy khách hàng',
                      subtitle: 'Vui lòng kiểm tra lại từ khóa tìm kiếm của bạn.',
                    );
                  }

                  return ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: customers.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final customer = customers[index];
                      final name = customer.fullName ?? customer.username;
                      final totalOrders = customer.totalOrders ?? 0;

                      return Card(
                        margin: EdgeInsets.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () => context.push('/staff/customers/${customer.id}'),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  radius: 24,
                                  backgroundColor: AppColors.primary.withOpacity(0.1),
                                  child: Text(
                                    name.substring(0, 1).toUpperCase(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                      fontSize: 18,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        name,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 15,
                                          color: AppColors.textPrimary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 4),
                                      if (customer.email.isNotEmpty)
                                        Text(
                                          customer.email,
                                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      if (customer.phone != null && customer.phone!.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          customer.phone!,
                                          style: const TextStyle(fontSize: 12, color: AppColors.textHint),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '$totalOrders đơn',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 4),
                                const Icon(Icons.chevron_right, color: AppColors.textHint, size: 20),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );
                }

                // Initial state — no search performed yet
                return const EmptyStateWidget(
                  icon: Icons.search_rounded,
                  title: 'Tìm kiếm khách hàng',
                  subtitle: 'Nhập tên/email/số điện thoại để tìm kiếm',
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:dio/dio.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/network/api_client.dart';

/// Remote data source for support chat API calls.
class ChatRemoteDataSource {
  final Dio _dio;

  ChatRemoteDataSource() : _dio = ApiClient().dio;

  /// Get list of support conversations.
  Future<List<Map<String, dynamic>>> getConversations() async {
    final response = await _dio.get(ApiEndpoints.supportConversations);
    final data = response.data as Map<String, dynamic>;
    final rawList = data['conversations'] ?? data['data'];
    if (rawList is List) {
      return rawList.cast<Map<String, dynamic>>();
    }
    return [];
  }

  /// Get messages for a specific conversation.
  Future<List<Map<String, dynamic>>> getMessages(String conversationId) async {
    final response = await _dio.get(
      ApiEndpoints.supportMessages(conversationId),
    );
    final data = response.data as Map<String, dynamic>;
    final rawList = data['messages'] ?? data['data'];
    if (rawList is List) {
      return rawList.cast<Map<String, dynamic>>();
    }
    return [];
  }

  /// Send a message to a conversation.
  Future<Map<String, dynamic>> sendMessage({
    required String conversationId,
    required String content,
  }) async {
    final response = await _dio.post(
      ApiEndpoints.supportMessages(conversationId),
      data: {'content': content},
    );
    final data = response.data as Map<String, dynamic>;
    final rawMsg = data['message'] ?? data['data'];
    if (rawMsg is Map) {
      return rawMsg.cast<String, dynamic>();
    }
    return {};
  }

  /// Mark conversation as read.
  Future<void> markConversationAsRead(String conversationId) async {
    await _dio.patch(ApiEndpoints.supportMarkRead(conversationId));
  }

  /// Close a support conversation.
  Future<void> closeConversation(String conversationId) async {
    await _dio.patch(ApiEndpoints.supportClose(conversationId));
  }
}

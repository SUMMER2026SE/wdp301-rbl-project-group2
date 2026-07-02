import 'dart:io';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/network/api_client.dart';
import 'package:foa_mobile/core/constants/api_endpoints.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:http_parser/http_parser.dart';

abstract class StaffChatRemoteDataSource {
  Future<List<ConversationModel>> getConversations({
    required String storeId,
  });

  Future<List<ChatMessageModel>> getConversationMessages({
    required String conversationId,
  });

  Future<ChatMessageModel> sendMessage({
    required String conversationId,
    required String content,
    String? imageUrl,
  });

  Future<String> uploadChatImage(File imageFile);

  Future<void> closeConversation({
    required String conversationId,
  });
}

class StaffChatRemoteDataSourceImpl implements StaffChatRemoteDataSource {
  final ApiClient _apiClient;

  StaffChatRemoteDataSourceImpl(this._apiClient);

  @override
  Future<List<ConversationModel>> getConversations({
    required String storeId,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.staffConversations,
        queryParameters: {'storeId': storeId},
      );

      final data = response.data;
      if (data != null) {
        final rawList = data['conversations'] ?? data['data'];
        if (rawList is List) {
          return rawList.map((e) => ConversationModel.fromJson(e as Map<String, dynamic>)).toList();
        }
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể tải danh sách hội thoại',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<List<ChatMessageModel>> getConversationMessages({
    required String conversationId,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiEndpoints.supportMessages(conversationId),
      );

      final data = response.data;
      if (data != null) {
        final rawList = data['messages'] ?? data['data'];
        if (rawList is List) {
          return rawList.map((e) => ChatMessageModel.fromJson(e as Map<String, dynamic>)).toList();
        }
      }
      return [];
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể tải lịch sử tin nhắn',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<ChatMessageModel> sendMessage({
    required String conversationId,
    required String content,
    String? imageUrl,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiEndpoints.supportMessages(conversationId),
        data: {
          'content': content,
          if (imageUrl != null) 'imageUrl': imageUrl,
        },
      );

      final data = response.data;
      if (data != null) {
        final rawMsg = data['message'] ?? data['data'];
        if (rawMsg != null) {
          return ChatMessageModel.fromJson(rawMsg as Map<String, dynamic>);
        }
      }
      throw const ServerException(message: 'Gửi tin nhắn thất bại');
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể gửi tin nhắn',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  String _mimeFromExtension(String ext) {
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  @override
  Future<String> uploadChatImage(File imageFile) async {
    try {
      final extension = imageFile.path.split('.').last.toLowerCase();
      final mimeType = _mimeFromExtension(extension);
      
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          contentType: MediaType.parse(mimeType),
        ),
      });

      final response = await _apiClient.dio.post(
        ApiEndpoints.fileUpload,
        data: formData,
      );

      final data = response.data;
      if (data != null && data['data'] != null && data['data']['secureUrl'] != null) {
        return data['data']['secureUrl'] as String;
      }
      throw const ServerException(message: 'Upload hình ảnh thất bại');
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Lỗi tải ảnh lên server',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> closeConversation({
    required String conversationId,
  }) async {
    try {
      await _apiClient.dio.patch(
        ApiEndpoints.supportClose(conversationId),
      );
    } on DioException catch (e) {
      if (e.error is NetworkException) throw e.error!;
      throw ServerException(
        message: e.response?.data?['message'] as String? ?? 'Không thể đóng cuộc hội thoại',
        statusCode: e.response?.statusCode,
      );
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}

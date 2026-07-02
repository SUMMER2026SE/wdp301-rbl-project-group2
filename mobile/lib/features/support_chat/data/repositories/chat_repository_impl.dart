import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/network/api_interceptors.dart';
import 'package:foa_mobile/features/support_chat/data/datasources/chat_remote_datasource.dart';
import 'package:foa_mobile/features/support_chat/domain/repositories/chat_repository.dart';

/// Implementation of [ChatRepository] using remote data source.
class ChatRepositoryImpl implements ChatRepository {
  final ChatRemoteDataSource _remoteDataSource;

  ChatRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getConversations() async {
    try {
      final conversations = await _remoteDataSource.getConversations();
      return Right(conversations);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> getMessages(
    String conversationId,
  ) async {
    try {
      final messages = await _remoteDataSource.getMessages(conversationId);
      return Right(messages);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, Map<String, dynamic>>> sendMessage({
    required String conversationId,
    required String content,
  }) async {
    try {
      final message = await _remoteDataSource.sendMessage(
        conversationId: conversationId,
        content: content,
      );
      return Right(message);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> markConversationAsRead(
    String conversationId,
  ) async {
    try {
      await _remoteDataSource.markConversationAsRead(conversationId);
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  @override
  Future<Either<Failure, void>> closeConversation(String conversationId) async {
    try {
      await _remoteDataSource.closeConversation(conversationId);
      return const Right(null);
    } catch (e) {
      return Left(_mapErrorToFailure(e));
    }
  }

  /// Map caught exceptions to typed [Failure] using typed exceptions
  /// from [ErrorInterceptor].
  Failure _mapErrorToFailure(dynamic error) {
    if (error is DioException) {
      final inner = error.error;

      if (inner is NetworkException) {
        return const NetworkFailure();
      }
      if (inner is TimeoutFailureException) {
        return const TimeoutFailure();
      }
      if (inner is ServerException) {
        final code = inner.statusCode;

        if (code == 401) return const AuthFailure();
        if (code == 403) return const ForbiddenFailure();
        if (code == 404) return const NotFoundFailure();

        if (inner.errorCode == 'VALIDATION_ERROR') {
          Map<String, String>? fieldErrors;
          if (inner.details != null && inner.details!.isNotEmpty) {
            fieldErrors = {
              for (final d in inner.details!)
                (d['path'] as String? ?? ''): (d['message'] as String? ?? ''),
            };
          }
          return ValidationFailure(
            message: inner.message,
            fieldErrors: fieldErrors,
          );
        }

        return ServerFailure(
          message: inner.message,
          statusCode: code,
        );
      }
    }

    return ServerFailure(message: error.toString());
  }
}

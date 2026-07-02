import 'dart:io';
import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/exceptions.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/features/staff_chat/data/datasources/staff_chat_remote_datasource.dart';
import 'package:foa_mobile/features/staff_chat/domain/repositories/staff_chat_repository.dart';

class StaffChatRepositoryImpl implements StaffChatRepository {
  final StaffChatRemoteDataSource _remoteDataSource;

  StaffChatRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<ConversationModel>>> getConversations({
    required String storeId,
  }) async {
    try {
      final conversations = await _remoteDataSource.getConversations(storeId: storeId);
      return Right(conversations);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<ChatMessageModel>>> getConversationMessages({
    required String conversationId,
  }) async {
    try {
      final messages = await _remoteDataSource.getConversationMessages(conversationId: conversationId);
      return Right(messages);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, ChatMessageModel>> sendMessage({
    required String conversationId,
    required String content,
    String? imageUrl,
  }) async {
    try {
      final message = await _remoteDataSource.sendMessage(
        conversationId: conversationId,
        content: content,
        imageUrl: imageUrl,
      );
      return Right(message);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, String>> uploadChatImage(File imageFile) async {
    try {
      final imageUrl = await _remoteDataSource.uploadChatImage(imageFile);
      return Right(imageUrl);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> closeConversation({
    required String conversationId,
  }) async {
    try {
      await _remoteDataSource.closeConversation(conversationId: conversationId);
      return const Right(null);
    } on NetworkException catch (e) {
      return Left(NetworkFailure(message: e.message));
    } on ServerException catch (e) {
      return Left(ServerFailure(message: e.message, statusCode: e.statusCode));
    } catch (e) {
      return Left(UnexpectedFailure(message: e.toString()));
    }
  }
}

import 'dart:io';
import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/chat_model.dart';

abstract class StaffChatRepository {
  Future<Either<Failure, List<ConversationModel>>> getConversations({
    required String storeId,
  });

  Future<Either<Failure, List<ChatMessageModel>>> getConversationMessages({
    required String conversationId,
  });

  Future<Either<Failure, ChatMessageModel>> sendMessage({
    required String conversationId,
    required String content,
    String? imageUrl,
  });

  Future<Either<Failure, String>> uploadChatImage(File imageFile);

  Future<Either<Failure, void>> closeConversation({
    required String conversationId,
  });
}

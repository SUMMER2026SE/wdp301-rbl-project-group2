import 'dart:io';
import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/features/staff_chat/domain/repositories/staff_chat_repository.dart';

class SendChatMessageUseCase {
  final StaffChatRepository _repository;
  SendChatMessageUseCase(this._repository);

  Future<Either<Failure, ChatMessageModel>> call({
    required String conversationId,
    required String content,
    String? imageUrl,
  }) {
    return _repository.sendMessage(
      conversationId: conversationId,
      content: content,
      imageUrl: imageUrl,
    );
  }
}

class UploadChatImageUseCase {
  final StaffChatRepository _repository;
  UploadChatImageUseCase(this._repository);

  Future<Either<Failure, String>> call(File imageFile) {
    return _repository.uploadChatImage(imageFile);
  }
}

class CloseConversationUseCase {
  final StaffChatRepository _repository;
  CloseConversationUseCase(this._repository);

  Future<Either<Failure, void>> call({
    required String conversationId,
  }) {
    return _repository.closeConversation(conversationId: conversationId);
  }
}

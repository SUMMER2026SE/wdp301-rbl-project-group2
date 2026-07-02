import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/features/staff_chat/domain/repositories/staff_chat_repository.dart';

class GetConversationMessagesUseCase {
  final StaffChatRepository _repository;

  GetConversationMessagesUseCase(this._repository);

  Future<Either<Failure, List<ChatMessageModel>>> call({
    required String conversationId,
  }) {
    return _repository.getConversationMessages(conversationId: conversationId);
  }
}

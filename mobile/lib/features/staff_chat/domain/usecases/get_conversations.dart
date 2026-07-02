import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/features/staff_chat/domain/repositories/staff_chat_repository.dart';

class GetConversationsUseCase {
  final StaffChatRepository _repository;

  GetConversationsUseCase(this._repository);

  Future<Either<Failure, List<ConversationModel>>> call({
    required String storeId,
  }) {
    return _repository.getConversations(storeId: storeId);
  }
}

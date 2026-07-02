import 'package:dartz/dartz.dart';
import 'package:foa_mobile/core/error/failures.dart';

/// Abstract repository interface for support chat operations.
/// Implemented in the data layer.
abstract class ChatRepository {
  /// Get list of support conversations.
  Future<Either<Failure, List<Map<String, dynamic>>>> getConversations();

  /// Get messages for a specific conversation.
  Future<Either<Failure, List<Map<String, dynamic>>>> getMessages(
    String conversationId,
  );

  /// Send a message to a conversation.
  Future<Either<Failure, Map<String, dynamic>>> sendMessage({
    required String conversationId,
    required String content,
  });

  /// Mark conversation as read.
  Future<Either<Failure, void>> markConversationAsRead(String conversationId);

  /// Close a support conversation.
  Future<Either<Failure, void>> closeConversation(String conversationId);
}

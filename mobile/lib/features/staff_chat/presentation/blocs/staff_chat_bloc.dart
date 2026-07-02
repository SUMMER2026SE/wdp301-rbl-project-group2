import 'dart:io';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:foa_mobile/core/models/chat_model.dart';
import 'package:foa_mobile/features/staff_chat/domain/usecases/get_conversations.dart';
import 'package:foa_mobile/features/staff_chat/domain/usecases/get_conversation_messages.dart';
import 'package:foa_mobile/features/staff_chat/domain/usecases/chat_actions.dart';

// ── Events ──
abstract class StaffChatEvent extends Equatable {
  const StaffChatEvent();

  @override
  List<Object?> get props => [];
}

class FetchConversationsEvent extends StaffChatEvent {
  final String storeId;

  const FetchConversationsEvent({required this.storeId});

  @override
  List<Object?> get props => [storeId];
}

class FetchMessagesEvent extends StaffChatEvent {
  final String conversationId;

  const FetchMessagesEvent({required this.conversationId});

  @override
  List<Object?> get props => [conversationId];
}

class SendChatTextEvent extends StaffChatEvent {
  final String conversationId;
  final String content;

  const SendChatTextEvent({required this.conversationId, required this.content});

  @override
  List<Object?> get props => [conversationId, content];
}

class SendChatImageEvent extends StaffChatEvent {
  final String conversationId;
  final File imageFile;

  const SendChatImageEvent({required this.conversationId, required this.imageFile});

  @override
  List<Object?> get props => [conversationId, imageFile];
}

class CloseChatEvent extends StaffChatEvent {
  final String conversationId;
  final String storeId;

  const CloseChatEvent({required this.conversationId, required this.storeId});

  @override
  List<Object?> get props => [conversationId, storeId];
}

class ReceiveRealtimeMessageEvent extends StaffChatEvent {
  final ChatMessageModel message;

  const ReceiveRealtimeMessageEvent(this.message);

  @override
  List<Object?> get props => [message];
}

// ── States ──
abstract class StaffChatState extends Equatable {
  const StaffChatState();

  @override
  List<Object?> get props => [];
}

class StaffChatInitial extends StaffChatState {
  const StaffChatInitial();
}

// Conversations States
class ConversationsLoading extends StaffChatState {
  const ConversationsLoading();
}

class ConversationsLoaded extends StaffChatState {
  final List<ConversationModel> conversations;

  const ConversationsLoaded(this.conversations);

  @override
  List<Object?> get props => [conversations];
}

class ConversationsError extends StaffChatState {
  final String message;

  const ConversationsError(this.message);

  @override
  List<Object?> get props => [message];
}

// Messages States
class MessagesLoading extends StaffChatState {
  const MessagesLoading();
}

class MessagesLoaded extends StaffChatState {
  final String conversationId;
  final List<ChatMessageModel> messages;
  final bool isSending;
  final String? error;

  const MessagesLoaded({
    required this.conversationId,
    required this.messages,
    this.isSending = false,
    this.error,
  });

  MessagesLoaded copyWith({
    List<ChatMessageModel>? messages,
    bool? isSending,
    String? error,
  }) {
    return MessagesLoaded(
      conversationId: conversationId,
      messages: messages ?? this.messages,
      isSending: isSending ?? this.isSending,
      error: error,
    );
  }

  @override
  List<Object?> get props => [conversationId, messages, isSending, error];
}

class MessagesError extends StaffChatState {
  final String message;

  const MessagesError(this.message);

  @override
  List<Object?> get props => [message];
}

// ── BLoC ──
class StaffChatBloc extends Bloc<StaffChatEvent, StaffChatState> {
  final GetConversationsUseCase _getConversationsUseCase;
  final GetConversationMessagesUseCase _getConversationMessagesUseCase;
  final SendChatMessageUseCase _sendChatMessageUseCase;
  final UploadChatImageUseCase _uploadChatImageUseCase;
  final CloseConversationUseCase _closeConversationUseCase;

  StaffChatBloc({
    required GetConversationsUseCase getConversationsUseCase,
    required GetConversationMessagesUseCase getConversationMessagesUseCase,
    required SendChatMessageUseCase sendChatMessageUseCase,
    required UploadChatImageUseCase uploadChatImageUseCase,
    required CloseConversationUseCase closeConversationUseCase,
  })  : _getConversationsUseCase = getConversationsUseCase,
        _getConversationMessagesUseCase = getConversationMessagesUseCase,
        _sendChatMessageUseCase = sendChatMessageUseCase,
        _uploadChatImageUseCase = uploadChatImageUseCase,
        _closeConversationUseCase = closeConversationUseCase,
        super(const StaffChatInitial()) {
    on<FetchConversationsEvent>(_onFetchConversations);
    on<FetchMessagesEvent>(_onFetchMessages);
    on<SendChatTextEvent>(_onSendText);
    on<SendChatImageEvent>(_onSendImage);
    on<ReceiveRealtimeMessageEvent>(_onReceiveRealtimeMessage);
    on<CloseChatEvent>(_onCloseChat);
  }

  Future<void> _onFetchConversations(
    FetchConversationsEvent event,
    Emitter<StaffChatState> emit,
  ) async {
    emit(const ConversationsLoading());
    final result = await _getConversationsUseCase(storeId: event.storeId);
    result.fold(
      (failure) => emit(ConversationsError(failure.message)),
      (conversations) => emit(ConversationsLoaded(conversations)),
    );
  }

  Future<void> _onFetchMessages(
    FetchMessagesEvent event,
    Emitter<StaffChatState> emit,
  ) async {
    emit(const MessagesLoading());
    final result = await _getConversationMessagesUseCase(conversationId: event.conversationId);
    result.fold(
      (failure) => emit(MessagesError(failure.message)),
      (messages) => emit(MessagesLoaded(
        conversationId: event.conversationId,
        messages: messages,
      )),
    );
  }

  Future<void> _onSendText(
    SendChatTextEvent event,
    Emitter<StaffChatState> emit,
  ) async {
    final currentState = state;
    if (currentState is! MessagesLoaded) return;

    emit(currentState.copyWith(isSending: true));

    final result = await _sendChatMessageUseCase(
      conversationId: event.conversationId,
      content: event.content,
    );

    result.fold(
      (failure) => emit(currentState.copyWith(isSending: false, error: failure.message)),
      (newMsg) {
        final updatedList = [...currentState.messages, newMsg];
        emit(MessagesLoaded(
          conversationId: event.conversationId,
          messages: updatedList,
          isSending: false,
        ));
      },
    );
  }

  Future<void> _onSendImage(
    SendChatImageEvent event,
    Emitter<StaffChatState> emit,
  ) async {
    final currentState = state;
    if (currentState is! MessagesLoaded) return;

    emit(currentState.copyWith(isSending: true));

    // First upload the image to Cloudinary
    final uploadResult = await _uploadChatImageUseCase(event.imageFile);

    await uploadResult.fold(
      (failure) async {
        emit(currentState.copyWith(isSending: false, error: failure.message));
      },
      (imageUrl) async {
        // Then send message with imageUrl
        final result = await _sendChatMessageUseCase(
          conversationId: event.conversationId,
          content: '[Hình ảnh]',
          imageUrl: imageUrl,
        );

        result.fold(
          (failure) => emit(currentState.copyWith(isSending: false, error: failure.message)),
          (newMsg) {
            final updatedList = [...currentState.messages, newMsg];
            emit(MessagesLoaded(
              conversationId: event.conversationId,
              messages: updatedList,
              isSending: false,
            ));
          },
        );
      },
    );
  }

  void _onReceiveRealtimeMessage(
    ReceiveRealtimeMessageEvent event,
    Emitter<StaffChatState> emit,
  ) {
    final currentState = state;
    if (currentState is MessagesLoaded) {
      // Prevent duplicate insertion
      final exists = currentState.messages.any((m) => m.id == event.message.id);
      if (!exists) {
        final updatedList = [...currentState.messages, event.message];
        emit(MessagesLoaded(
          conversationId: currentState.conversationId,
          messages: updatedList,
        ));
      }
    }
  }

  Future<void> _onCloseChat(
    CloseChatEvent event,
    Emitter<StaffChatState> emit,
  ) async {
    final result = await _closeConversationUseCase(conversationId: event.conversationId);
    result.fold(
      (failure) {
        // ignore or update message
      },
      (_) {
        // Force refresh conversation list
        add(FetchConversationsEvent(storeId: event.storeId));
      },
    );
  }
}

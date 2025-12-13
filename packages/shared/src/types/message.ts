/**
 * Message entity representing a chat message
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string; // Encrypted content
  type: MessageType;
  metadata?: MessageMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType = 'text' | 'file' | 'image' | 'voice' | 'video';

/**
 * Metadata for different message types
 */
export interface MessageMetadata {
  // For file/image/voice/video messages
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  thumbnailUrl?: string;

  // For voice/video messages
  duration?: number;

  // For replies
  replyToMessageId?: string;

  // For reactions
  reactions?: MessageReaction[];
}

/**
 * Message reaction
 */
export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: Date;
}

/**
 * Message delivery status
 */
export interface MessageStatus {
  messageId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
}

/**
 * Create message DTO
 */
export interface CreateMessageDto {
  conversationId: string;
  content: string;
  type: MessageType;
  metadata?: MessageMetadata;
}

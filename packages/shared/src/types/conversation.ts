/**
 * Conversation entity representing a chat conversation
 */
export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string; // For group conversations
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount?: number;
}

export type ConversationType = 'direct' | 'group';

/**
 * Conversation member
 */
export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
}

export type MemberRole = 'owner' | 'admin' | 'member';

/**
 * Create conversation DTO
 */
export interface CreateConversationDto {
  type: ConversationType;
  name?: string;
  memberIds: string[]; // User IDs to add
}

/**
 * Update conversation DTO
 */
export interface UpdateConversationDto {
  name?: string;
  avatarUrl?: string;
}

/**
 * Add member to conversation DTO
 */
export interface AddMemberDto {
  userId: string;
  role?: MemberRole;
}

import { NormalizedItem, ExternalSyncUnit } from '@devrev/ts-adaas';

// Normalizes a Google Chat Space object
export function normalizeSpace(space: any): ExternalSyncUnit {
  return {
    id: space.name, // e.g., "spaces/AAAAAAAAAAA"
    name: space.displayName,
    description: space.spaceDetails?.description || 'A Google Chat Space',
    item_count: -1, // We don't know the message count upfront
  };
}

// Normalizes a Google Chat User object
export function normalizeUser(user: any): NormalizedItem {
  const now = new Date().toISOString();
  return {
    id: user.name, // e.g., "users/123456789"
    created_date: now,
    modified_date: now,
    data: {
      email: user.email,
      displayName: user.displayName,
    },
  };
}

// Normalizes a Google Chat Message object
export function normalizeMessage(message: any, threadId: string): NormalizedItem {
  return {
    id: message.name, // e.g., "spaces/AAA/messages/BBB"
    created_date: message.createTime,
    modified_date: message.lastUpdateTime || message.createTime,
    data: {
      text: [message.text], // Wrap in array for rich_text format
      creator: message.sender.name,
      parent_id: threadId,
    },
  };
}

// Creates a logical Thread object from the first message of a thread
export function normalizeThread(firstMessage: any): NormalizedItem {
  return {
    id: firstMessage.thread.name, // e.g., "spaces/AAA/threads/CCC"
    created_date: firstMessage.createTime,
    modified_date: firstMessage.lastUpdateTime || firstMessage.createTime,
    data: {
      title: firstMessage.text.substring(0, 100), // Use first 100 chars as title
      body: [firstMessage.text], // Use full text as body
      space_id: firstMessage.space.name,
    },
  };
}

import { ExtractorEventType, processTask } from '@devrev/ts-adaas';
import {
  normalizeMessage,
  normalizeThread,
  normalizeUser,
} from '../../external-system/data-normalization';
import { HttpClient } from '../../external-system/http-client';
import { ExtractorState } from '../index';

const repos = [
  { itemType: 'gchat_thread' },
  { itemType: 'gchat_message' },
  { itemType: 'gchat_user' },
];

processTask<ExtractorState>({
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);
    const httpClient = new HttpClient(adapter.event);

    const spaceName = adapter.event.payload.event_context.sync_unit;
    const allMessages = await httpClient.listMessages(spaceName);

    // Group messages by their thread name
    const threadsMap = new Map<string, any[]>();
    const usersMap = new Map<string, any>();

    for (const message of allMessages) {
      // Skip empty or deleted messages
      if (!message.text || !message.thread?.name) continue;

      const threadId = message.thread.name;
      if (!threadsMap.has(threadId)) {
        threadsMap.set(threadId, []);
      }
      threadsMap.get(threadId)?.push(message);

      // Collect unique users
      if (!usersMap.has(message.sender.name)) {
        usersMap.set(message.sender.name, message.sender);
      }
    }

    // Process each thread
    for (const [threadId, messages] of threadsMap.entries()) {
      // Sort messages by creation time to find the first one
      messages.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());

      const firstMessage = messages[0];

      // Create and push the logical thread object
      const threadItem = normalizeThread(firstMessage);
      await adapter.getRepo('gchat_thread')?.push([threadItem]);

      // Create and push message objects for all messages in the thread
      const messageItems = messages.map((msg) => normalizeMessage(msg, threadId));
      await adapter.getRepo('gchat_message')?.push(messageItems);
    }

    // Push all unique user objects
    const userItems = Array.from(usersMap.values()).map((user) => normalizeUser(user));
    if (userItems.length > 0) {
      await adapter.getRepo('gchat_user')?.push(userItems);
    }

    await adapter.emit(ExtractorEventType.ExtractionDataDone);
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionDataProgress);
  },
});
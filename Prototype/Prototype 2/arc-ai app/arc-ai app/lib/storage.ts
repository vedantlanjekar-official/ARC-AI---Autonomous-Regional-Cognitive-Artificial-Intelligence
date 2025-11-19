import { Message } from './types';

const STORAGE_KEY = 'arc-ai-chat-history';
const MAX_MESSAGES = 100; // Limit stored messages

export function saveMessages(messages: Message[]): void {
  try {
    const messagesToSave = messages.slice(-MAX_MESSAGES);
    const serialized = JSON.stringify(messagesToSave);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
}

export function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const messages: Message[] = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return messages.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
    return [];
  }
}

export function clearMessages(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear messages from localStorage:', error);
  }
}


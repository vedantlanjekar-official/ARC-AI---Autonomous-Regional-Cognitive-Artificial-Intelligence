export interface AskResponse {
  status: 'ok' | 'error';
  answer?: string;
  tokens?: number;
  error?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';


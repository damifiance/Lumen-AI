export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  highlightId?: string;
  selectedText?: string;
  paperPath?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

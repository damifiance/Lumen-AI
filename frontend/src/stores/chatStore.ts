import { create } from 'zustand';
import type { ChatMessage, ModelInfo } from '../types/chat';
import { streamAsk, streamConversation } from '../api/chat';

interface ChatState {
  messages: ChatMessage[];
  model: string;
  models: ModelInfo[];
  isStreaming: boolean;
  isOpen: boolean;
  abortController: AbortController | null;
  setModels: (models: ModelInfo[]) => void;
  setModel: (model: string) => void;
  toggleOpen: () => void;
  setOpen: (open: boolean) => void;
  sendMessage: (paperPath: string, content: string) => void;
  askAboutSelection: (paperPath: string, selectedText: string, question: string, highlightId?: string) => void;
  stopStreaming: () => void;
  clearMessages: () => void;
}

let messageId = 0;
function nextId() {
  return `msg-${++messageId}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  model: localStorage.getItem('preferred-model') || '',
  models: [],
  isStreaming: false,
  isOpen: false,
  abortController: null,

  setModels: (models) => {
    set({ models });
    // Auto-select first model if none is selected
    const current = get().model;
    if ((!current || !models.some((m) => m.id === current)) && models.length > 0) {
      const preferred = localStorage.getItem('preferred-model');
      const match = preferred && models.find((m) => m.id === preferred);
      set({ model: match ? match.id : models[0].id });
    }
  },

  setModel: (model) => {
    localStorage.setItem('preferred-model', model);
    set({ model });
  },

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  sendMessage: (paperPath: string, content: string) => {
    const { model, messages } = get();
    const userMsg: ChatMessage = { id: nextId(), role: 'user', content };
    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '' };

    set({
      messages: [...messages, userMsg, assistantMsg],
      isStreaming: true,
    });

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = streamConversation(
      { paper_path: paperPath, messages: allMessages, model },
      {
        onToken: (token) => {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + token }
                : m
            ),
          }));
        },
        onDone: () => set({ isStreaming: false, abortController: null }),
        onError: (error) => {
          set((s) => ({
            isStreaming: false,
            abortController: null,
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: `Error: ${error.message}` }
                : m
            ),
          }));
        },
      }
    );

    set({ abortController: controller });
  },

  askAboutSelection: (paperPath: string, selectedText: string, question: string, highlightId?: string) => {
    const { model } = get();
    const userContent = `${question}\n\n> ${selectedText}`;
    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: userContent, highlightId, selectedText, paperPath };
    const assistantMsg: ChatMessage = { id: nextId(), role: 'assistant', content: '', highlightId, selectedText, paperPath };

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
      isOpen: true,
    }));

    const controller = streamAsk(
      { paper_path: paperPath, selected_text: selectedText, question, model },
      {
        onToken: (token) => {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: m.content + token }
                : m
            ),
          }));
        },
        onDone: () => set({ isStreaming: false, abortController: null }),
        onError: (error) => {
          set((s) => ({
            isStreaming: false,
            abortController: null,
            messages: s.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: `Error: ${error.message}` }
                : m
            ),
          }));
        },
      }
    );

    set({ abortController: controller });
  },

  stopStreaming: () => {
    const { abortController } = get();
    abortController?.abort();
    set({ isStreaming: false, abortController: null });
  },

  clearMessages: () => set({ messages: [] }),
}));

import { apiFetch, apiStreamUrl, getAuthHeaders } from './client';
import type { ModelInfo } from '../types/chat';

export function getModels(): Promise<ModelInfo[]> {
  return apiFetch('/chat/models');
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export function streamAsk(
  data: {
    paper_path: string;
    selected_text: string;
    question: string;
    model: string;
  },
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  getAuthHeaders().then((authHeaders) => {
    fetch(apiStreamUrl('/chat/ask'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(data),
      signal: controller.signal,
    })
      .then((res) => handleSSEResponse(res, callbacks))
      .catch((err) => {
        if (err.name !== 'AbortError') callbacks.onError(err);
      });
  });

  return controller;
}

export function streamConversation(
  data: {
    paper_path: string;
    messages: { role: string; content: string }[];
    model: string;
  },
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  getAuthHeaders().then((authHeaders) => {
    fetch(apiStreamUrl('/chat/conversation'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(data),
      signal: controller.signal,
    })
      .then((res) => handleSSEResponse(res, callbacks))
      .catch((err) => {
        if (err.name !== 'AbortError') callbacks.onError(err);
      });
  });

  return controller;
}

async function handleSSEResponse(
  response: Response,
  callbacks: StreamCallbacks
): Promise<void> {
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      errorMsg = body.detail || errorMsg;
    } catch {
      // Use default error
    }
    callbacks.onError(new Error(errorMsg));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error('No response body'));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = 'token';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
        continue;
      }
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6);

        if (currentEvent === 'done') {
          callbacks.onDone();
          return;
        }

        if (currentEvent === 'error') {
          try {
            const parsed = JSON.parse(jsonStr);
            callbacks.onError(new Error(parsed.error || 'Unknown error'));
          } catch {
            callbacks.onError(new Error(jsonStr));
          }
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.content) {
            callbacks.onToken(parsed.content);
          }
        } catch {
          // skip malformed JSON
        }

        currentEvent = 'token';
      }
    }
  }
  callbacks.onDone();
}

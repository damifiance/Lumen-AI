import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ChatMessage as ChatMessageType } from '../../types/chat';
import { User, Sun } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content && !isUser;

  return (
    <div className={`px-5 py-4 ${isUser ? 'bg-chat-user' : 'bg-chat-assistant'}`}>
      <div className="flex gap-3">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            isUser
              ? 'bg-accent/10 text-accent'
              : 'bg-gradient-to-br from-teal/10 to-accent/10 text-teal'
          }`}
        >
          {isUser ? <User size={14} /> : <Sun size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            isUser ? 'text-accent/60' : 'text-teal/60'
          }`}>
            {isUser ? 'You' : 'AI'}
          </span>
          <div className="mt-1 text-[13px] leading-relaxed text-gray-700 prose prose-sm max-w-none">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : isEmpty ? (
              <div className="flex gap-1 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/40 streaming-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent/40 streaming-dot" />
                <div className="w-1.5 h-1.5 rounded-full bg-accent/40 streaming-dot" />
              </div>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match;
                    return inline ? (
                      <code
                        className="bg-gray-100 text-accent px-1.5 py-0.5 rounded-md text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <SyntaxHighlighter
                        style={oneLight}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          fontSize: '12px',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

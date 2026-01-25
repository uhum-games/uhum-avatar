/**
 * ChatComponent - Chat-focused component
 * 
 * Renders a chat-style interface for conversational interactions.
 * Shows messages and provides input for sending new messages.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ComponentRenderProps } from '../registry';

export interface ChatMessage {
  id?: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp?: number | Date;
}

export const ChatComponent: React.FC<ComponentRenderProps> = ({
  component,
  data,
  onIntent,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convert data to messages
  const messages: ChatMessage[] = (data as ChatMessage[]).filter(
    item => item && typeof item === 'object' && 'text' in item
  );

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle send message
  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;

    // Trigger message intent
    onIntent?.('send_message', { text: inputValue.trim() });
    setInputValue('');
  }, [inputValue, onIntent]);

  // Handle key press (Enter to send)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div 
      className={`uhum-chat ${className ?? ''}`}
      data-component={component.name}
    >
      {/* Header */}
      <div className="uhum-chat__header">
        <h2 className="uhum-chat__title">{component.title ?? 'Chat'}</h2>
        {component.description && (
          <p className="uhum-chat__description">{component.description}</p>
        )}
      </div>

      {/* Messages */}
      <div className="uhum-chat__messages">
        {messages.length === 0 ? (
          <div className="uhum-chat__empty">
            <span className="uhum-chat__empty-icon">💬</span>
            <span className="uhum-chat__empty-text">Start a conversation</span>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id ?? index}
              className={`uhum-chat__message uhum-chat__message--${message.sender}`}
            >
              <div className="uhum-chat__message-content">
                <div className="uhum-chat__message-text">{message.text}</div>
                {message.timestamp && (
                  <div className="uhum-chat__message-time">
                    {formatTime(message.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="uhum-chat__input-area">
        <textarea
          className="uhum-chat__input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="uhum-chat__send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim()}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

/**
 * Format timestamp for display.
 */
function formatTime(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Send icon component.
 */
function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

export default ChatComponent;

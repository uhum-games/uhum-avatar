import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

/**
 * Chat input component with text field and send button.
 */
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form className="avatar-chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? 'Connecting...' : 'Type a message...'}
        disabled={disabled}
        className="avatar-chat-field"
      />
      <button type="submit" disabled={disabled || !text.trim()} className="avatar-chat-send">
        Send
      </button>
    </form>
  );
}

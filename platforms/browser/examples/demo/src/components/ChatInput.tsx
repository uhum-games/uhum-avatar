import React, { useState } from 'react';
import { useAvatar } from '@uhum/avatar';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const { client, state } = useAvatar();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (state.connected) {
      client.sendMessage(message);
    } else {
      // Demo mode
      client.dispatch({
        type: 'SHOW_MESSAGE',
        text: `Demo: "${message}" would be sent to the Brain`,
        messageType: 'info',
      });
      setTimeout(() => {
        client.dispatch({ type: 'HIDE_MESSAGE' });
      }, 3000);
    }

    setMessage('');
  };

  const suggestions = [
    'Show my pending invoices',
    'Pay invoice INV-001',
    'What\'s my total due?',
  ];

  return (
    <div className="chat-container">
      <div className="chat-suggestions">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            className="chat-suggestion"
            onClick={() => setMessage(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message to the AI..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="chat-submit">
          Send
        </button>
      </form>
    </div>
  );
}

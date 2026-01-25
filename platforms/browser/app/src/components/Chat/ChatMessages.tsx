import { useMemo, useRef } from 'react';
import type { useAvatar } from '@uhum/avatar-lib';

/**
 * Default greeting messages when no agent-specific greeting is available.
 * These should feel conversational and welcoming.
 */
const DEFAULT_GREETINGS = [
  "What's on your mind?",
  "Let's chat!",
  "How can I help?",
  "Ready when you are",
  "Ask me anything",
  "Hey there! What can I do for you?",
  "I'm all ears",
  "What would you like to know?",
];

/**
 * Generate a stable seed for greeting selection.
 * Uses agent ID if available, otherwise uses a random seed generated once per session.
 */
function getGreetingSeed(agentId: string | null, sessionSeed: number): number {
  if (agentId) {
    // Use agent ID to generate a deterministic seed
    return agentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
  // Fall back to session seed (generated once when component mounts)
  return sessionSeed;
}

/**
 * Pick a greeting from the list using a stable seed.
 */
function pickGreeting(seed: number, greetings: string[]): string {
  if (greetings.length === 0) return DEFAULT_GREETINGS[0];
  return greetings[seed % greetings.length];
}

interface ChatMessagesProps {
  state: ReturnType<typeof useAvatar>['state'];
}

/**
 * Chat messages display area.
 * Shows loading, messages, facts, or empty state with greeting.
 */
export function ChatMessages({ state }: ChatMessagesProps) {
  // Generate a stable session seed once when the component mounts.
  // This ensures the greeting doesn't change during connection attempts.
  const sessionSeedRef = useRef<number>(Math.floor(Math.random() * 10000));

  // Get greeting message from brand greetings or default
  const greeting = useMemo(() => {
    const customGreetings = state.dossier?.presentation?.brand?.greetings;
    const greetingsToUse = customGreetings?.length ? customGreetings : DEFAULT_GREETINGS;
    const seed = getGreetingSeed(state.agentId, sessionSeedRef.current);
    return pickGreeting(seed, greetingsToUse);
  }, [state.dossier?.presentation?.brand?.greetings, state.agentId]);

  // Show loading
  if (state.loading) {
    return (
      <div className="avatar-chat-loading">
        <div className="avatar-loading-spinner avatar-loading-spinner--small" />
        <span>{state.loading.message || 'Loading...'}</span>
      </div>
    );
  }

  // Show message if present
  if (state.message) {
    return (
      <div className={`avatar-chat-message avatar-chat-message--${state.message.messageType}`}>
        {state.message.text}
      </div>
    );
  }

  // Show facts/data
  if (state.facts.length > 0) {
    return (
      <div className="avatar-chat-facts">
        <pre>{JSON.stringify(state.facts, null, 2)}</pre>
      </div>
    );
  }

  // Empty state with greeting
  return (
    <div className="avatar-chat-empty">
      <span className="avatar-chat-empty-icon">💬</span>
      <p>{greeting}</p>
    </div>
  );
}

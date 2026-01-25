import React from 'react';
import { ConnectionState } from '@uhum/avatar';

interface ConnectionStatusProps {
  state: ConnectionState;
  agentId: string | null;
  error: string | null;
}

export function ConnectionStatus({ state, agentId, error }: ConnectionStatusProps) {
  const statusColors: Record<ConnectionState, string> = {
    disconnected: '#ef4444',
    connecting: '#f59e0b',
    connected: '#10b981',
    closing: '#f59e0b',
  };

  return (
    <div className="connection-status">
      <div className="connection-indicator">
        <span
          className="connection-dot"
          style={{ backgroundColor: statusColors[state] }}
        />
        <span className="connection-text">
          {state === 'connected' && agentId ? `Connected to ${agentId}` : state}
        </span>
      </div>
      {error && <div className="connection-error">{error}</div>}
    </div>
  );
}

import type { AgentInfo, AgentAgentCard } from '@uhum/avatar-lib';

interface ChatHeaderProps {
  agentId: string;
  agentInfo: AgentInfo;
  connectionState: string;
  /** Full agentCard from Brain's WELCOME message (has identity/version) */
  agentCard: AgentAgentCard | null;
}

/**
 * Compact chat header for SmartChat.
 * Shows agent branding, version, and connection status.
 */
export function ChatHeader({ agentId, agentInfo, agentCard, connectionState }: ChatHeaderProps) {
  // Prefer brand name (display name), fall back to identity name, then agent ID
  // Use agentCard from state (Brain's WELCOME) as primary source
  const agentName =
    agentCard?.presentation?.brand?.name ||
    agentCard?.identity?.name ||
    agentInfo.agentCard?.presentation?.brand?.name ||
    agentId;

  const version = agentCard?.identity?.version;

  const getStatusLabel = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'failed':
        return 'Connection failed';
      case 'closing':
        return 'Closing...';
      default:
        return connectionState;
    }
  };

  return (
    <div className="avatar-chat-header">
      {agentInfo.agentCard?.presentation?.brand?.logo && (
        <img
          src={agentInfo.agentCard.presentation.brand.logo}
          alt={agentName}
          className="avatar-chat-header-logo"
        />
      )}
      <div className="avatar-chat-header-info">
        <div className="avatar-chat-header-title-row">
          <span className="avatar-chat-header-title">{agentName}</span>
          <span
            className={`status-indicator status-${connectionState}`}
            title={getStatusLabel()}
          />
        </div>
        {version && <span className="avatar-chat-header-version">v{version}</span>}
      </div>
    </div>
  );
}

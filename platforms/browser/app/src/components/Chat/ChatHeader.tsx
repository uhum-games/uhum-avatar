import type { AgentInfo, AgentDossier } from '@uhum/avatar-lib';

interface ChatHeaderProps {
  agentId: string;
  agentInfo: AgentInfo;
  connectionState: string;
  /** Full dossier from Brain's WELCOME message (has identity/version) */
  dossier: AgentDossier | null;
}

/**
 * Compact chat header for SmartChat.
 * Shows agent branding, version, and connection status.
 */
export function ChatHeader({ agentId, agentInfo, dossier, connectionState }: ChatHeaderProps) {
  // Prefer brand name (display name), fall back to identity name, then agent ID
  // Use dossier from state (Brain's WELCOME) as primary source
  const agentName =
    dossier?.presentation?.brand?.name ||
    dossier?.identity?.name ||
    agentInfo.dossier?.presentation?.brand?.name ||
    agentId;

  const version = dossier?.identity?.version;

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
      {agentInfo.dossier?.presentation?.brand?.logo && (
        <img
          src={agentInfo.dossier.presentation.brand.logo}
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

import type { ConnectionStep } from '@uhum/avatar-lib';

/**
 * Connection step information for the loading UI.
 */
interface ConnectionStepInfo {
  id: ConnectionStep;
  label: string;
  description: string;
}

const CONNECTION_STEPS: ConnectionStepInfo[] = [
  { id: 'locating', label: 'Finding your agent', description: 'Locating agent in the network...' },
  { id: 'connecting', label: 'Opening connection', description: 'Establishing secure connection...' },
  { id: 'greeting', label: 'Saying hello', description: 'Introducing ourselves to the agent...' },
  { id: 'loading', label: 'Loading capabilities', description: 'Learning what this agent can do...' },
  { id: 'ready', label: 'All set!', description: 'Ready to chat!' },
];

interface ConnectionStepsScreenProps {
  currentStep: ConnectionStep;
  agentName?: string;
}

/**
 * Beautiful animated connection steps screen.
 * Shows progress through connection phases.
 */
export function ConnectionStepsScreen({ currentStep, agentName }: ConnectionStepsScreenProps) {
  const stepIndex = CONNECTION_STEPS.findIndex((s) => s.id === currentStep);
  const activeStep = CONNECTION_STEPS[stepIndex] || CONNECTION_STEPS[0];
  const isReady = currentStep === 'ready';

  return (
    <div className="avatar-screen avatar-connection-screen">
      <div className="connection-container">
        {/* Agent name if available */}
        {agentName && <div className="connection-agent-name">{agentName}</div>}

        {/* Current status message */}
        <div className={`connection-status ${isReady ? 'connection-status--ready' : ''}`}>
          <span className="connection-status-icon">
            {isReady ? '✓' : <div className="connection-spinner" />}
          </span>
          <span className="connection-status-label">{activeStep.label}</span>
        </div>

        {/* Description */}
        <p className="connection-description">{activeStep.description}</p>

        {/* Progress steps */}
        <div className="connection-steps">
          {CONNECTION_STEPS.map((step, index) => {
            const isCompleted = index < stepIndex;
            const isActive = index === stepIndex;
            const isPending = index > stepIndex;

            return (
              <div
                key={step.id}
                className={`connection-step ${isCompleted ? 'connection-step--completed' : ''} ${
                  isActive ? 'connection-step--active' : ''
                } ${isPending ? 'connection-step--pending' : ''}`}
              >
                <div className="connection-step-indicator">
                  {isCompleted ? (
                    <span className="connection-step-check">✓</span>
                  ) : isActive ? (
                    <span className="connection-step-dot connection-step-dot--pulse" />
                  ) : (
                    <span className="connection-step-dot" />
                  )}
                </div>
                {index < CONNECTION_STEPS.length - 1 && (
                  <div
                    className={`connection-step-line ${
                      isCompleted ? 'connection-step-line--completed' : ''
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

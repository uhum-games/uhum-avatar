import React, { useEffect, useState } from 'react';
import {
  AvatarProvider,
  useAvatar,
  UhumView,
} from '@uhum/avatar';
import { InvoiceList } from './components/InvoiceList';
import { ChatInput } from './components/ChatInput';
import { Header } from './components/Header';
import { ConnectionStatus } from './components/ConnectionStatus';

/**
 * Quick Start Invoice Application using Uhum Avatar.
 *
 * This demonstrates:
 * - Connecting to an Agent (mock server)
 * - Sending intentions (pay_invoice)
 * - Receiving decisions with view instructions
 * - Reactive state updates
 *
 * Configuration (via environment variables):
 * - VITE_AGENT_URL: WebSocket URL of the Agent (default: ws://localhost:8080)
 * - VITE_AGENT_ID: Agent ID to connect to (default: quickstart.billing)
 */

// Agent connection configuration
const AGENT_URL = import.meta.env.VITE_AGENT_URL || 'ws://localhost:8080';
const AGENT_ID = import.meta.env.VITE_AGENT_ID || 'quickstart.billing';

function App() {
  return (
    <AvatarProvider options={{ debug: true, initialRoute: '/invoices' }}>
      <UhumView className="quickstart-app">
        <Header />
        <main className="quickstart-main">
          <InvoiceApp />
        </main>
        <ChatInput />
      </UhumView>
    </AvatarProvider>
  );
}

function InvoiceApp() {
  const { state, client } = useAvatar();
  const [error, setError] = useState<string | null>(null);

  // Connect to Agent on mount
  useEffect(() => {
    const connect = async () => {
      try {
        // Connect to the Agent using Uhum protocol
        console.log(`Connecting to ${AGENT_URL} as ${AGENT_ID}...`);
        await client.connect(AGENT_URL, AGENT_ID);
        console.log(`Connected to uhum://${AGENT_ID}`);
      } catch (err) {
        console.log('Could not connect to Agent, using offline mode');
        setError('Agent not running. Using offline mode with sample data.');

        // Load sample data for offline mode
        client.dispatch({
          type: 'UPDATE_FACTS',
          facts: getSampleInvoices(),
        });
        client.dispatch({
          type: 'SET_CONNECTED',
          connected: true,
          agentId: AGENT_ID,
        });
      }
    };

    connect();

    return () => {
      client.disconnect();
    };
  }, [client]);

  const handlePayInvoice = (invoiceId: string) => {
    if (state.connected) {
      client.sendIntention('pay_invoice', { invoice_id: invoiceId });
    } else {
      // Offline mode: simulate payment
      simulatePayment(invoiceId, client);
    }
  };

  const handleSendMessage = (text: string) => {
    if (state.connected) {
      client.sendMessage(text);
    } else {
      // Offline mode: simulate response
      client.dispatch({
        type: 'SHOW_MESSAGE',
        text: `Offline mode: "${text}" would be sent to the Agent`,
        messageType: 'info',
      });
    }
  };

  return (
    <>
      <ConnectionStatus
        state={state.connectionState}
        agentId={state.agentId}
        error={error}
      />

      <InvoiceList
        invoices={state.facts as Invoice[]}
        highlightedIds={state.highlightedElements}
        onPay={handlePayInvoice}
      />
    </>
  );
}

// Sample data helpers

interface Invoice {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  dueDate: string;
}

function getSampleInvoices(): Invoice[] {
  return [
    {
      id: 'INV-001',
      amount: 99.50,
      status: 'pending',
      description: 'Web Design Services',
      dueDate: '2026-02-01',
    },
    {
      id: 'INV-002',
      amount: 250.00,
      status: 'pending',
      description: 'Monthly Hosting',
      dueDate: '2026-02-15',
    },
    {
      id: 'INV-003',
      amount: 75.00,
      status: 'overdue',
      description: 'Domain Renewal',
      dueDate: '2026-01-15',
    },
    {
      id: 'INV-004',
      amount: 500.00,
      status: 'paid',
      description: 'Logo Design',
      dueDate: '2026-01-01',
    },
  ];
}

function simulatePayment(invoiceId: string, client: ReturnType<typeof useAvatar>['client']) {
  // Show loading
  client.dispatch({ type: 'SHOW_LOADING', message: 'Processing payment...' });

  // Simulate API delay
  setTimeout(() => {
    // Hide loading
    client.dispatch({ type: 'HIDE_LOADING' });

    // Update invoice status
    const facts = client.getState().facts as Invoice[];
    const updatedFacts = facts.map((inv) =>
      inv.id === invoiceId ? { ...inv, status: 'paid' as const } : inv
    );
    client.dispatch({ type: 'UPDATE_FACTS', facts: updatedFacts });

    // Show success message
    client.dispatch({
      type: 'SHOW_MESSAGE',
      text: `Invoice ${invoiceId} paid successfully!`,
      messageType: 'success',
    });

    // Highlight the paid invoice
    client.dispatch({ type: 'HIGHLIGHT', elementRef: invoiceId });

    // Schedule highlight removal
    setTimeout(() => {
      client.dispatch({ type: 'CLEAR_HIGHLIGHT', elementRef: invoiceId });
    }, 3000);

    // Schedule message removal
    setTimeout(() => {
      client.dispatch({ type: 'HIDE_MESSAGE' });
    }, 4000);
  }, 1500);
}

export default App;

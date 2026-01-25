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
 * Demo Invoice Application using Uhum Avatar.
 *
 * This demonstrates:
 * - Connecting to an Agent (mock server)
 * - Sending intentions (pay_invoice)
 * - Receiving decisions with view instructions
 * - Reactive state updates
 */
function App() {
  return (
    <AvatarProvider options={{ debug: true, initialRoute: '/invoices' }}>
      <UhumView className="demo-app">
        <Header />
        <main className="demo-main">
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

  // Connect to Brain on mount
  useEffect(() => {
    const connect = async () => {
      try {
        // Connect to the Brain using UHUM protocol
        // The second argument is the agent address
        await client.connect('ws://localhost:8080', 'demo.agent');
      } catch (err) {
        console.log('Could not connect to Brain, using demo mode');
        setError('Brain not running. Using demo mode with sample data.');

        // Load sample data for demo
        client.dispatch({
          type: 'UPDATE_FACTS',
          facts: getSampleInvoices(),
        });
        client.dispatch({
          type: 'SET_CONNECTED',
          connected: true,
          agentId: 'demo.billing',
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
      // Demo mode: simulate payment
      simulatePayment(invoiceId, client);
    }
  };

  const handleSendMessage = (text: string) => {
    if (state.connected) {
      client.sendMessage(text);
    } else {
      // Demo mode: simulate response
      client.dispatch({
        type: 'SHOW_MESSAGE',
        text: `Demo mode: "${text}" would be sent to the Brain`,
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

// Demo helpers

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

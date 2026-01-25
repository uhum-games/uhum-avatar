/**
 * Mock WebSocket Server for Uhum Avatar Demo
 *
 * Simulates a Brain agent for testing the Avatar client.
 *
 * Run with: node mock-server.js
 */

import { WebSocketServer } from 'ws';

const PORT = 8080;

// Sample data
const invoices = [
  { id: 'INV-001', amount: 99.5, status: 'pending', description: 'Web Design Services', dueDate: '2026-02-01' },
  { id: 'INV-002', amount: 250.0, status: 'pending', description: 'Monthly Hosting', dueDate: '2026-02-15' },
  { id: 'INV-003', amount: 75.0, status: 'overdue', description: 'Domain Renewal', dueDate: '2026-01-15' },
  { id: 'INV-004', amount: 500.0, status: 'paid', description: 'Logo Design', dueDate: '2026-01-01' },
];

const wss = new WebSocketServer({ port: PORT });

console.log(`🧠 Mock Brain Server running on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('✅ Client connected');

  // Send initial data (MEMORY message)
  const memoryMessage = {
    type: 'MEMORY',
    events: invoices,
  };
  ws.send(JSON.stringify(memoryMessage));
  console.log('📤 Sent MEMORY:', invoices.length, 'invoices');

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📥 Received:', message);

      switch (message.type) {
        case 'INTENTION':
          handleIntention(ws, message);
          break;

        case 'MESSAGE':
          handleMessage(ws, message);
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
  });
});

function handleIntention(ws, message) {
  const { intent, params } = message;

  switch (intent) {
    case 'pay_invoice': {
      const invoiceId = params.invoice_id;
      const invoice = invoices.find((inv) => inv.id === invoiceId);

      if (!invoice) {
        sendDecision(ws, 'rejected', [], [
          { type: 'message', messageType: 'error', text: `Invoice ${invoiceId} not found` },
        ]);
        return;
      }

      if (invoice.status === 'paid') {
        sendDecision(ws, 'rejected', [], [
          { type: 'message', messageType: 'warning', text: `Invoice ${invoiceId} is already paid` },
        ]);
        return;
      }

      // Simulate processing delay
      sendViewInstruction(ws, { type: 'loading', show: true, message: 'Processing payment...' });

      setTimeout(() => {
        // Update invoice status
        invoice.status = 'paid';

        sendDecision(ws, 'accepted', invoices, [
          { type: 'loading', show: false },
          { type: 'message', messageType: 'success', text: `Invoice ${invoiceId} paid successfully!`, duration: 4000 },
          { type: 'highlight', elementRef: invoiceId, duration: 3000 },
        ]);
      }, 1500);
      break;
    }

    case 'list_invoices':
      sendDecision(ws, 'accepted', invoices, [
        { type: 'message', messageType: 'info', text: `Found ${invoices.length} invoices`, duration: 2000 },
      ]);
      break;

    default:
      sendDecision(ws, 'rejected', [], [
        { type: 'message', messageType: 'error', text: `Unknown intent: ${intent}` },
      ]);
  }
}

function handleMessage(ws, message) {
  const { text } = message;
  const lowerText = text.toLowerCase();

  // Simple NLU simulation
  if (lowerText.includes('pay') && lowerText.includes('inv')) {
    // Extract invoice ID
    const match = text.match(/INV-\d+/i);
    if (match) {
      handleIntention(ws, {
        type: 'INTENTION',
        intent: 'pay_invoice',
        params: { invoice_id: match[0].toUpperCase() },
      });
      return;
    }
  }

  if (lowerText.includes('pending') || lowerText.includes('invoice')) {
    const pending = invoices.filter((inv) => inv.status === 'pending');
    sendDecision(ws, 'accepted', pending, [
      { type: 'message', messageType: 'info', text: `You have ${pending.length} pending invoices`, duration: 3000 },
    ]);
    return;
  }

  if (lowerText.includes('total') || lowerText.includes('due')) {
    const total = invoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);
    sendDecision(ws, 'accepted', [], [
      { type: 'message', messageType: 'info', text: `Total amount due: $${total.toFixed(2)}`, duration: 3000 },
    ]);
    return;
  }

  // Default response
  sendDecision(ws, 'accepted', [], [
    { type: 'message', messageType: 'neutral', text: `I understood: "${text}". Try "show pending invoices" or "pay INV-001"`, duration: 4000 },
  ]);
}

function sendDecision(ws, status, facts, viewInstructions) {
  const decision = {
    type: 'DECISION',
    status,
    facts,
    viewInstructions,
  };
  ws.send(JSON.stringify(decision));
  console.log('📤 Sent DECISION:', status);
}

function sendViewInstruction(ws, instruction) {
  const decision = {
    type: 'DECISION',
    status: 'pending',
    facts: [],
    viewInstructions: [instruction],
  };
  ws.send(JSON.stringify(decision));
}

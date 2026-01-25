import React from 'react';

interface Invoice {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  description: string;
  dueDate: string;
}

interface InvoiceListProps {
  invoices: Invoice[];
  highlightedIds: Set<string>;
  onPay: (invoiceId: string) => void;
}

export function InvoiceList({ invoices, highlightedIds, onPay }: InvoiceListProps) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="invoice-empty">
        <div className="invoice-empty-icon">📋</div>
        <p>No invoices yet</p>
        <p className="invoice-empty-hint">Connecting to agent...</p>
      </div>
    );
  }

  return (
    <div className="invoice-list">
      <h2 className="invoice-list-title">Your Invoices</h2>
      <div className="invoice-grid">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            isHighlighted={highlightedIds.has(invoice.id)}
            onPay={() => onPay(invoice.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface InvoiceCardProps {
  invoice: Invoice;
  isHighlighted: boolean;
  onPay: () => void;
}

function InvoiceCard({ invoice, isHighlighted, onPay }: InvoiceCardProps) {
  const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', label: 'Pending' },
    paid: { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', label: 'Paid' },
    overdue: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444', label: 'Overdue' },
  };

  const status = statusStyles[invoice.status];

  return (
    <div
      id={invoice.id}
      data-ref={invoice.id}
      className={`invoice-card ${isHighlighted ? 'invoice-card--highlighted' : ''}`}
    >
      <div className="invoice-card-header">
        <span className="invoice-id">{invoice.id}</span>
        <span
          className="invoice-status"
          style={{ backgroundColor: status.bg, color: status.text }}
        >
          {status.label}
        </span>
      </div>

      <div className="invoice-description">{invoice.description}</div>

      <div className="invoice-amount">
        ${invoice.amount.toFixed(2)}
      </div>

      <div className="invoice-due">
        Due: {formatDate(invoice.dueDate)}
      </div>

      {invoice.status !== 'paid' && (
        <button className="invoice-pay-btn" onClick={onPay}>
          Pay Now
        </button>
      )}

      {invoice.status === 'paid' && (
        <div className="invoice-paid-badge">
          ✓ Paid
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

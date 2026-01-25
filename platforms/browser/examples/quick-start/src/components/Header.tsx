import React from 'react';

export function Header() {
  return (
    <header className="quickstart-header">
      <div className="quickstart-header-left">
        <div className="quickstart-logo">
          <span className="quickstart-logo-icon">🧠</span>
          <span className="quickstart-logo-text">Acme Billing</span>
        </div>
        <span className="quickstart-badge">Uhum Avatar</span>
      </div>
      <nav className="quickstart-nav">
        <a href="#invoices" className="quickstart-nav-link active">Invoices</a>
        <a href="#payments" className="quickstart-nav-link">Payments</a>
        <a href="#settings" className="quickstart-nav-link">Settings</a>
      </nav>
    </header>
  );
}

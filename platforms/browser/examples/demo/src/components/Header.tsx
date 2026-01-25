import React from 'react';

export function Header() {
  return (
    <header className="demo-header">
      <div className="demo-header-left">
        <div className="demo-logo">
          <span className="demo-logo-icon">🧠</span>
          <span className="demo-logo-text">Acme Billing</span>
        </div>
        <span className="demo-badge">Uhum Avatar Demo</span>
      </div>
      <nav className="demo-nav">
        <a href="#invoices" className="demo-nav-link active">Invoices</a>
        <a href="#payments" className="demo-nav-link">Payments</a>
        <a href="#settings" className="demo-nav-link">Settings</a>
      </nav>
    </header>
  );
}

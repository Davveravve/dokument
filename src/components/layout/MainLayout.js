// src/components/layout/MainLayout.js
import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Stig Olofssons Kontrollsystem</h1>
        <nav>
          <ul>
            <li><Link to="/">Hem</Link></li>
            <li><Link to="/customers">Kunder</Link></li>
            <li><Link to="/templates">Mallar</Link></li>
          </ul>
        </nav>
      </header>
      
      <main className="app-content">
        <Outlet />
      </main>
      
      <footer className="app-footer">
        <p>© 2025 David Rajala</p>
      </footer>
    </div>
  );
};

export default MainLayout;
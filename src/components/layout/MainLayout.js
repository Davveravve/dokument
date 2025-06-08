// src/components/layout/MainLayout.js - Med utloggning och användarinfo
import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { currentUser, userProfile, logout } = useAuth();

  const navigationItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      )
    },
    {
      path: '/customers',
      label: 'Kunder',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
    {
      path: '/templates',
      label: 'Mallar',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      )
    },
    {
      path: '/supabase-test',
      label: 'Test',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
        </svg>
      ),
      isTest: true
    }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUserMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="app-layout">
      {/* Desktop Sidebar - endast ikoner */}
      <aside className="desktop-sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
              <path d="M8 12h8M12 8v8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Navigation */}
        <nav className="desktop-nav">
          {navigationItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              className={`desktop-nav-link ${isActive(item.path) ? 'active' : ''} ${item.isTest ? 'test-link' : ''}`}
              title={item.label}
            >
              {item.icon}
              {isActive(item.path) && <div className="active-dot" />}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="desktop-user">
          <div 
            className="user-avatar" 
            title="Profil & Abonnemang"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <span>{getInitials(userProfile?.contactPerson || currentUser?.displayName)}</span>
            {userProfile?.subscription?.plan === 'professional' && (
              <div className="subscription-indicator professional">
                <span>Pro</span>
              </div>
            )}
          </div>
          
          {/* User dropdown menu */}
          {userMenuOpen && (
            <div className="user-dropdown">
              <div className="user-dropdown-header">
                <div className="user-info">
                  <span className="user-name">
                    {userProfile?.contactPerson || currentUser?.displayName || 'Användare'}
                  </span>
                  <span className="user-email">{currentUser?.email}</span>
                </div>
              </div>
              
              <div className="user-dropdown-content">
                <Link 
                  to="/subscription" 
                  className="dropdown-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="m12 1 1.84 3.68L18 5.84l-1.16 3.84L20 12l-3.16 2.32L18 18.16l-3.84-1.16L12 23l-2.32-3.16L5.84 18l1.16-3.84L4 12l3.16-2.32L5.84 5.84l3.84 1.16z"/>
                  </svg>
                  Abonnemang
                </Link>
                
                <button 
                  onClick={handleLogout}
                  className="dropdown-item logout-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logga ut
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
                <path d="M8 12h8M12 8v8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span>Stig Olofssons</span>
          </div>

          <button 
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Öppna meny"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          {navigationItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''} ${item.isTest ? 'test-link' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
              {isActive(item.path) && <div className="mobile-active-indicator" />}
            </Link>
          ))}
        </nav>
        
        <div className="mobile-user-section">
          <div className="mobile-user">
            <div className="user-avatar">
              <span>{getInitials(userProfile?.contactPerson || currentUser?.displayName)}</span>
            </div>
            <div className="user-info">
              <span className="user-name">
                {userProfile?.contactPerson || currentUser?.displayName || 'Användare'}
              </span>
              <span className="user-role">
                {userProfile?.subscription?.plan === 'professional' ? 'Professional Plan' : 'Trial'}
              </span>
            </div>
            {userProfile?.subscription?.plan === 'professional' && (
              <div className="subscription-badge professional">
                Pro
              </div>
            )}
          </div>
          
          <div className="mobile-user-actions">
            <Link 
              to="/subscription" 
              className="mobile-user-action"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="m12 1 1.84 3.68L18 5.84l-1.16 3.84L20 12l-3.16 2.32L18 18.16l-3.84-1.16L12 23l-2.32-3.16L5.84 18l1.16-3.84L4 12l3.16-2.32L5.84 5.84l3.84 1.16z"/>
              </svg>
              Abonnemang
            </Link>
            
            <button 
              onClick={handleLogout}
              className="mobile-user-action logout-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logga ut
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* User menu overlay för desktop */}
      {userMenuOpen && (
        <div 
          className="user-menu-overlay"
          onClick={() => setUserMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
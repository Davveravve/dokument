// src/pages/LoginPage.js - Enkel inloggningssida
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.password) {
      setError('Alla fält måste fyllas i');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.error || 'Inloggning misslyckades');
      }
      // Om inloggning lyckas omdirigeras användaren automatiskt
    } catch (err) {
      setError('Ett oväntat fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          {/* Logo och header */}
          <div className="login-header">
            <div className="logo">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
                  <path d="M8 12h8M12 8v8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h1>Flexpect</h1>
            </div>
            
            <div className="login-title">
              <h2>Logga in</h2>
              <p>Välkommen tillbaka till ditt kontrollsystem</p>
            </div>
          </div>

          {/* Inloggningsformulär */}
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">E-postadress</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="din@epost.se"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Lösenord</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Ditt lösenord"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <path d="M1 1l22 22"/>
                        <path d="M8.71 8.71a4 4 0 1 1 5.65 5.65"/>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Loggar in...
                </>
              ) : (
                'Logga in'
              )}
            </button>
          </form>

          {/* Registreringslänk */}
          <div className="login-footer">
            <p>
              Har du inget konto?{' '}
              <Link to="/register" className="register-link">
                Skapa konto här
              </Link>
            </p>
            
            <button 
              type="button"
              className="forgot-password"
              onClick={() => alert('Glömt lösenord funktionen kommer snart')}
            >
              Glömt lösenord?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
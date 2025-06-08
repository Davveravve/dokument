// src/pages/RegisterPage.js - Registreringssida
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    agreeToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setError('Alla obligatoriska fält måste fyllas i');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      setError('Ange en giltig e-postadress');
      return false;
    }
    
    if (formData.password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Lösenorden matchar inte');
      return false;
    }
    
    if (!formData.companyName.trim()) {
      setError('Företagsnamn krävs');
      return false;
    }
    
    if (!formData.contactPerson.trim()) {
      setError('Kontaktperson krävs');
      return false;
    }
    
    if (!formData.agreeToTerms) {
      setError('Du måste acceptera användarvillkoren');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await register(formData.email, formData.password, {
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        phone: formData.phone
      });
      
      if (result.success) {
        setSuccess('Konto skapat! Du kan nu logga in med dina uppgifter.');
        // Rensa formuläret
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          companyName: '',
          contactPerson: '',
          phone: '',
          agreeToTerms: false
        });
      } else {
        setError(result.error || 'Registrering misslyckades');
      }
    } catch (err) {
      setError('Ett oväntat fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          {/* Header */}
          <div className="register-header">
            <div className="logo">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
                  <path d="M8 12h8M12 8v8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h1>Flexpect</h1>
            </div>
            
            <div className="register-title">
              <h2>Skapa konto</h2>
              <p>Kom igång med gratis nivån - uppgradera när du behöver</p>
            </div>
          </div>

          {/* Formulär */}
          <form onSubmit={handleSubmit} className="register-form">
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
            
            {success && (
              <div className="success-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22,4 12,14.01 9,11.01"/>
                </svg>
                {success}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="companyName">Företagsnamn *</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Ditt företags namn"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactPerson">Kontaktperson *</label>
              <input
                type="text"
                id="contactPerson"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                placeholder="För- och efternamn"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Telefonnummer</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="070-123 45 67"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-postadress *</label>
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
              <label htmlFor="password">Lösenord *</label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minst 6 tecken"
                  required
                  minLength={6}
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Bekräfta lösenord *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Ange lösenordet igen"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <span className="checkbox-text">
                  Jag accepterar{' '}
                  <a href="#" className="link">användarvillkoren</a>
                  {' '}och{' '}
                  <a href="#" className="link">integritetspolicyn</a>
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              className="register-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Skapar konto...
                </>
              ) : (
                'Skapa konto'
              )}
            </button>
          </form>

          {/* Inloggningslänk */}
          <div className="register-footer">
            <p>
              Har du redan ett konto?{' '}
              <Link to="/login" className="login-link">
                Logga in här
              </Link>
            </p>
          </div>

          {/* Features */}
          <div className="register-features">
            <h3>Vad ingår i den gratis nivån?</h3>
            <div className="features-list">
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>1 kund</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>1 anläggning</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>1 kontroll</span>
              </div>
              <div className="feature-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20,6 9,17 4,12"/>
                </svg>
                <span>PDF-export inkluderat</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
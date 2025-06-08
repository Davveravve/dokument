// src/components/auth/AuthForm.js - Ren version utan konflikter
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    agreeToTerms: false
  });

  const { currentUser, login, register, authError, setAuthError } = useAuth();

  // Hantera Google Password Manager och overlay-problem
  useEffect(() => {
    const removeGoogleOverlays = () => {
      const overlays = document.querySelectorAll('[role="alert"], .password-warning, [data-google]');
      overlays.forEach(overlay => {
        if (overlay.textContent?.includes('liknande lösenord') || 
            overlay.textContent?.includes('data breach') ||
            overlay.textContent?.includes('Check your saved passwords')) {
          overlay.style.display = 'none';
          overlay.remove();
        }
      });
    };

    const intervals = [100, 500, 1000, 2000];
    const timeouts = intervals.map(delay => 
      setTimeout(removeGoogleOverlays, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    setError('');
    if (authError) setAuthError(null);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('E-postadress krävs');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      setError('Ange en giltig e-postadress');
      return false;
    }
    
    if (!formData.password || formData.password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken');
      return false;
    }
    
    if (!isLogin) {
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
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const result = await login(formData.email, formData.password);
        
        if (result?.success) {
          console.log('Login successful!');
        } else {
          setError(result?.error || 'Inloggning misslyckades');
        }
      } else {
        const result = await register(formData.email, formData.password, {
          companyName: formData.companyName,
          contactPerson: formData.contactPerson,
          phone: formData.phone
        });
        
        if (result?.success) {
          if (result.requiresVerification) {
            setSuccess('Konto skapat! En verifieringslänk har skickats till din e-post.');
          } else {
            setSuccess('Konto skapat! Du får 14 dagars gratis provperiod.');
          }
          
          setFormData({
            email: '',
            password: '',
            companyName: '',
            contactPerson: '',
            phone: '',
            agreeToTerms: false
          });
        } else {
          setError(result?.error || 'Registrering misslyckades');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Ett oväntat fel uppstod. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    if (authError) setAuthError(null);
    setFormData({
      email: '',
      password: '',
      companyName: '',
      contactPerson: '',
      phone: '',
      agreeToTerms: false
    });
  };

  const displayError = error || authError;

  return (
    <div className="login-card">
      {/* Header */}
      <div className="login-header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>
              <path d="M8 12h8M12 8v8" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1>DubbelCheck</h1>
        </div>
        
        <div className="login-title">
          <h2>{isLogin ? 'Logga in' : 'Skapa konto'}</h2>
          <p>
            {isLogin 
              ? 'Välkommen tillbaka till ditt kontrollsystem'
              : 'Kom igång med 14 dagars gratis provperiod'
            }
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="login-form" noValidate>
        {displayError && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {displayError}
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

        {/* Registreringsspecifika fält */}
        {!isLogin && (
          <>
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
                autoComplete="organization"
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
                autoComplete="name"
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
                autoComplete="tel"
              />
            </div>
          </>
        )}

        {/* E-post */}
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
            autoComplete={isLogin ? "email" : "username"}
          />
        </div>

        {/* Lösenord */}
        <div className="form-group">
          <label htmlFor="password">Lösenord *</label>
          <div className="password-input">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isLogin ? 'Ditt lösenord' : 'Minst 6 tecken'}
              required
              minLength={6}
              disabled={loading}
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
              disabled={loading}
              tabIndex={-1}
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

        {/* Användarvillkor för registrering */}
        {!isLogin && (
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
                <a 
                  href="#" 
                  className="link"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Öppna användarvillkor');
                  }}
                >
                  användarvillkoren
                </a>
                {' '}och{' '}
                <a 
                  href="#" 
                  className="link"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('Öppna integritetspolicy');
                  }}
                >
                  integritetspolicyn
                </a>
              </span>
            </label>
          </div>
        )}

        {/* Submit knapp */}
        <button 
          type="submit" 
          className={isLogin ? "login-btn" : "register-btn"}
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="spinner"></div>
              {isLogin ? 'Loggar in...' : 'Skapar konto...'}
            </>
          ) : (
            <>
              {isLogin ? 'Logga in' : 'Skapa konto'}
            </>
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="login-footer">
        <p>
          {isLogin ? 'Har du inget konto?' : 'Har du redan ett konto?'}
        </p>
        <button 
          type="button" 
          onClick={toggleMode}
          className={isLogin ? "register-link" : "login-link"}
          disabled={loading}
        >
          {isLogin ? 'Skapa konto' : 'Logga in'}
        </button>

        {/* Glömt lösenord för inloggning */}
        {isLogin && (
          <button 
            type="button"
            className="forgot-password"
            onClick={() => {
              console.log('Återställ lösenord för:', formData.email);
              alert('Lösenordsåterställning är inte implementerad än');
            }}
            disabled={loading}
          >
            Glömt lösenordet?
          </button>
        )}
      </div>

      {/* Features för registrering */}
      {!isLogin && (
        <div className="register-features">
          <h3>Vad ingår i provperioden?</h3>
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
              <span>3 mallar</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <span>1 GB lagring</span>
            </div>
            <div className="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
              <span>Obegränsade kontroller</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthForm;
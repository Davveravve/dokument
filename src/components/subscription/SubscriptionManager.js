// src/components/subscription/SubscriptionManager.js - Snygg säljande version med rabattkoder
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const SubscriptionManager = () => {
  const { currentUser, userProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const plans = {
    free: {
      name: 'Basic',
      description: 'Kom igång gratis',
      monthly: 0,
      yearly: 0,
      features: {
        customers: 1,
        templates: 2,
        inspections: 2
      },
      highlight: false
    },
    plus: {
      name: 'Plus',
      description: 'Mest populära valet',
      monthly: 199,
      yearly: 1990,
      features: {
        customers: 5,
        templates: 20,
        inspections: 'Obegränsat'
      },
      highlight: true,
      savings: 'Spara 398 kr/år'
    },
    pro: {
      name: 'Pro',
      description: 'För stora företag',
      monthly: 499,
      yearly: 4990,
      features: {
        customers: 'Obegränsat',
        templates: 'Obegränsat',
        inspections: 'Obegränsat'
      },
      highlight: false,
      savings: 'Spara 998 kr/år'
    }
  };

  const currentSubscription = userProfile?.subscription || {
    plan: 'free',
    status: 'active'
  };

  const calculatePrice = (plan) => {
    const basePrice = billingCycle === 'monthly' ? plans[plan].monthly : plans[plan].yearly;
    
    if (appliedPromo) {
      if (appliedPromo.discount === 100) {
        return 0; // Gratis om 100% rabatt
      }
      return Math.round(basePrice * (1 - appliedPromo.discount / 100));
    }
    
    return basePrice;
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setPromoLoading(true);
    setPromoError('');

    try {
      // Hämta rabattkod från Firebase
      const promoDoc = await getDoc(doc(db, 'promoCodes', promoCode.toUpperCase()));
      
      if (!promoDoc.exists()) {
        setPromoError('Ogiltig rabattkod');
        setPromoLoading(false);
        return;
      }

      const promoData = promoDoc.data();
      
      // Kontrollera om koden är aktiv
      if (!promoData.active) {
        setPromoError('Rabattkoden är inte aktiv');
        setPromoLoading(false);
        return;
      }

      // Kontrollera utgångsdatum
      const now = new Date();
      const expiryDate = promoData.expiryDate?.toDate();
      
      if (expiryDate && now > expiryDate) {
        setPromoError('Rabattkoden har gått ut');
        setPromoLoading(false);
        return;
      }

      // Kontrollera användningsgränser
      if (promoData.maxUses && promoData.usedCount >= promoData.maxUses) {
        setPromoError('Rabattkoden har använts för många gånger');
        setPromoLoading(false);
        return;
      }

      // Kontrollera om användaren redan använt koden
      if (promoData.usedBy && promoData.usedBy.includes(currentUser.uid)) {
        setPromoError('Du har redan använt denna rabattkod');
        setPromoLoading(false);
        return;
      }

      // Tillämpa rabattkoden
      setAppliedPromo({
        code: promoCode.toUpperCase(),
        discount: promoData.discount,
        description: promoData.description
      });
      
      setPromoError('');
      console.log('✅ Promo code applied:', promoData);
      
    } catch (err) {
      console.error('Error validating promo code:', err);
      setPromoError('Kunde inte validera rabattkod');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    setLoading(true);
    setError('');

    try {
      console.log('🚀 Starting upgrade to:', planId, 'billing:', billingCycle);
      alert(`Uppgradering till ${plans[planId].name} kommer snart med Stripe!`);
    } catch (err) {
      console.error('Error upgrading:', err);
      setError('Kunde inte starta uppgradering. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="error-state">Du måste vara inloggad för att hantera abonnemang</div>;
  }

  return (
    <div className="subscription-page">
      {/* Hero Section */}
      <div className="subscription-hero">
        <h1>Välj rätt plan för ditt företag</h1>
        <p>Skala din verksamhet med professionella kontrollsystem</p>
        
        {/* Billing Toggle */}
        <div className="billing-switch">
          <span className={billingCycle === 'monthly' ? 'active' : ''}>Månadsvis</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={billingCycle === 'yearly'}
              onChange={(e) => setBillingCycle(e.target.checked ? 'yearly' : 'monthly')}
            />
            <span className="slider"></span>
          </label>
          <span className={billingCycle === 'yearly' ? 'active' : ''}>
            Årligen 
            <span className="discount-badge">-17%</span>
          </span>
        </div>
      </div>

      {/* Rabattkod sektion */}
      <div className="promo-section">
        <h3>Har du en rabattkod?</h3>
        <div className="promo-input-group">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder="Ange rabattkod"
            className="promo-input"
            disabled={appliedPromo || promoLoading}
          />
          <button
            onClick={validatePromoCode}
            disabled={!promoCode.trim() || appliedPromo || promoLoading}
            className="promo-btn"
          >
            {promoLoading ? 'Validerar...' : 'Tillämpa'}
          </button>
        </div>
        
        {promoError && (
          <div className="promo-error">
            <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {promoError}
          </div>
        )}
        
        {appliedPromo && (
          <div className="promo-success">
            <svg className="success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
            <div>
              <strong>Rabattkod tillämpad!</strong>
              <p>{appliedPromo.description} ({appliedPromo.discount}% rabatt)</p>
            </div>
            <button 
              onClick={() => {
                setAppliedPromo(null);
                setPromoCode('');
              }}
              className="remove-promo"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="plans-container">
        <div className="plans-grid">
          {Object.entries(plans).map(([planId, plan]) => (
            <div 
              key={planId}
              className={`plan-card ${plan.highlight ? 'featured' : ''} ${currentSubscription.plan === planId ? 'current' : ''}`}
            >
              {plan.highlight && (
                <div className="popular-ribbon">
                  <span>POPULÄR</span>
                </div>
              )}

              <div className="plan-header">
                <h3>{plan.name}</h3>
                <p className="plan-description">{plan.description}</p>
                
                <div className="pricing">
                  {planId === 'free' ? (
                    <div className="price-display">
                      <span className="price">Gratis</span>
                      <span className="period">för alltid</span>
                    </div>
                  ) : (
                    <div className="price-display">
                      {appliedPromo && appliedPromo.discount === 100 && planId === 'pro' ? (
                        <div className="free-upgrade">
                          <span className="original-price">
                            {billingCycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12)} kr
                          </span>
                          <span className="price">GRATIS</span>
                          <span className="period">med rabattkod!</span>
                        </div>
                      ) : (
                        <>
                          {appliedPromo && calculatePrice(planId) !== (billingCycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12)) && (
                            <span className="original-price">
                              {billingCycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12)} kr
                            </span>
                          )}
                          <span className="price">
                            {calculatePrice(planId)}
                            <span className="currency">kr</span>
                          </span>
                          <span className="period">
                            /{billingCycle === 'monthly' ? 'månad' : 'månad'}
                          </span>
                          {billingCycle === 'yearly' && (
                            <>
                              <div className="yearly-price">
                                Faktureras {calculatePrice(planId) * 12} kr/år
                              </div>
                              <div className="savings-badge">
                                {plan.savings}
                              </div>
                            </>
                          )}
                          {appliedPromo && calculatePrice(planId) !== (billingCycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12)) && (
                            <div className="promo-savings">
                              Spara {(billingCycle === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12)) - calculatePrice(planId)} kr med {appliedPromo.code}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="features-section">
                <div className="feature-grid">
                  <div className="feature-item">
                    <div className="feature-number">
                      {typeof plan.features.customers === 'number' ? 
                        plan.features.customers : 
                        <span className="unlimited">∞</span>
                      }
                    </div>
                    <div className="feature-label">
                      {plan.features.customers === 1 ? 'Kund' : 'Kunder'}
                    </div>
                  </div>
                  
                  <div className="feature-item">
                    <div className="feature-number">
                      {typeof plan.features.templates === 'number' ? 
                        plan.features.templates : 
                        <span className="unlimited">∞</span>
                      }
                    </div>
                    <div className="feature-label">
                      {plan.features.templates === 1 ? 'Mall' : 'Mallar'}
                    </div>
                  </div>
                  
                  <div className="feature-item">
                    <div className="feature-number">
                      {typeof plan.features.inspections === 'number' ? 
                        plan.features.inspections : 
                        <span className="unlimited">∞</span>
                      }
                    </div>
                    <div className="feature-label">Kontroller</div>
                  </div>
                </div>

                {planId !== 'free' && (
                  <div className="bonus-features">
                    <div className="bonus-item">
                      <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                      <span>Obegränsad lagring</span>
                    </div>
                    <div className="bonus-item">
                      <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20,6 9,17 4,12"/>
                      </svg>
                      <span>Prioriterad support</span>
                    </div>
                    {planId === 'pro' && (
                      <div className="bonus-item">
                        <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          
                        </svg>
                        <span></span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="plan-action">
                {currentSubscription.plan === planId ? (
                  <button className="action-btn current-plan">
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                    Nuvarande plan
                  </button>
                ) : (
                  <button
                    className={`action-btn ${plan.highlight ? 'featured-btn' : 'upgrade-btn'}`}
                    onClick={() => handleUpgrade(planId)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="spinner"></div>
                        Laddar...
                      </>
                    ) : planId === 'free' ? (
                      'Välj Basic'
                    ) : (
                      <>
                        <span>Uppgradera till {plan.name}</span>
                        <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Section */}
      <div className="trust-section">
        <div className="trust-content">
          <h3>Säker betalning & flexibla villkor</h3>
          <div className="trust-items">
            <div className="trust-item">
              <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <div>
                <h4>Säker betalning</h4>
                <p>256-bit SSL kryptering via Stripe</p>
              </div>
            </div>
            <div className="trust-item">
              <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <div>
                <h4>Ingen bindningstid</h4>
                <p>Avbryt när som helst</p>
              </div>
            </div>
            <div className="trust-item">
              <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <div>
                <h4>30 dagars garanti</h4>
                <p>Inte nöjd? Få pengarna tillbaka</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      <style jsx>{`
        .subscription-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: white;
          padding: 0;
        }

        .subscription-hero {
          text-align: center;
          padding: 60px 20px 40px;
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        }

        .subscription-hero h1 {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #fff 0%, #00ff00 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subscription-hero p {
          font-size: 1.25rem;
          color: #888;
          margin-bottom: 40px;
        }

        .billing-switch {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          font-weight: 600;
        }

        .billing-switch span {
          transition: all 0.3s ease;
        }

        .billing-switch span.active {
          color: #00ff00;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 30px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #333;
          transition: 0.3s;
          border-radius: 30px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #00ff00;
        }

        input:checked + .slider:before {
          transform: translateX(30px);
        }

        .discount-badge {
          background: #00ff00;
          color: black;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-left: 8px;
        }

        .plans-container {
          padding: 40px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .promo-section {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
          text-align: center;
        }

        .promo-section h3 {
          margin-bottom: 16px;
          color: #ccc;
        }

        .promo-input-group {
          display: flex;
          gap: 12px;
          max-width: 400px;
          margin: 0 auto 16px;
        }

        .promo-input {
          flex: 1;
          padding: 12px 16px;
          background: #2a2a2a;
          border: 2px solid #444;
          border-radius: 8px;
          color: white;
          font-size: 1rem;
          transition: border-color 0.3s ease;
        }

        .promo-input:focus {
          outline: none;
          border-color: #00ff00;
        }

        .promo-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .promo-btn {
          padding: 12px 24px;
          background: #00ff00;
          color: black;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .promo-btn:hover:not(:disabled) {
          background: #00cc00;
        }

        .promo-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .promo-error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #ff4444;
          font-size: 0.9rem;
          margin-top: 8px;
        }

        .promo-success {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #003300;
          border: 1px solid #00ff00;
          border-radius: 8px;
          padding: 12px 16px;
          margin-top: 8px;
          position: relative;
        }

        .promo-success div {
          flex: 1;
          text-align: left;
        }

        .promo-success strong {
          color: #00ff00;
          display: block;
          margin-bottom: 4px;
        }

        .promo-success p {
          color: #ccc;
          margin: 0;
          font-size: 0.9rem;
        }

        .remove-promo {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 4px 8px;
          border-radius: 4px;
          transition: color 0.3s ease;
        }

        .remove-promo:hover {
          color: #ff4444;
        }

        .success-icon, .error-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .original-price {
          text-decoration: line-through;
          color: #888;
          font-size: 1.5rem;
          margin-bottom: 8px;
          display: block;
        }

        .free-upgrade .price {
          color: #00ff00;
          font-size: 2.5rem;
        }

        .promo-savings {
          background: #00ff00;
          color: black;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 8px;
          display: inline-block;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          align-items: stretch;
        }

        .plan-card {
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 16px;
          padding: 32px 24px;
          position: relative;
          transition: all 0.3s ease;
          height: fit-content;
        }

        .plan-card:hover {
          transform: translateY(-4px);
          border-color: #555;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .plan-card.featured {
          border-color: #00ff00;
          transform: scale(1.05);
          background: linear-gradient(135deg, #1a1a1a 0%, #0a3a0a 100%);
        }

        .plan-card.featured:hover {
          transform: scale(1.05) translateY(-4px);
        }

        .popular-ribbon {
          position: absolute;
          top: -2px;
          left: 50%;
          transform: translateX(-50%);
          background: #00ff00;
          color: black;
          padding: 8px 24px;
          border-radius: 0 0 8px 8px;
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 1px;
        }

        .plan-header {
          text-align: center;
          margin-bottom: 32px;
          margin-top: 20px;
        }

        .plan-header h3 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .plan-description {
          color: #888;
          margin-bottom: 24px;
        }

        .pricing {
          margin-bottom: 16px;
        }

        .price-display {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .price {
          font-size: 3rem;
          font-weight: 700;
          color: #00ff00;
          line-height: 1;
        }

        .currency {
          font-size: 1.5rem;
          margin-left: 4px;
        }

        .period {
          color: #888;
          font-size: 1rem;
          margin-top: 4px;
        }

        .yearly-price {
          color: #666;
          font-size: 0.9rem;
          margin-top: 8px;
        }

        .savings-badge {
          background: #00ff00;
          color: black;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          margin-top: 8px;
          display: inline-block;
        }

        .features-section {
          margin-bottom: 32px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .feature-item {
          text-align: center;
          padding: 16px 8px;
          background: #2a2a2a;
          border-radius: 8px;
        }

        .feature-number {
          font-size: 2rem;
          font-weight: 700;
          color: #00ff00;
          margin-bottom: 4px;
        }

        .unlimited {
          font-size: 2.5rem;
        }

        .feature-label {
          font-size: 0.9rem;
          color: #888;
        }

        .bonus-features {
          border-top: 1px solid #333;
          padding-top: 16px;
        }

        .bonus-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.9rem;
          color: #ccc;
        }

        .check-icon {
          width: 16px;
          height: 16px;
          color: #00ff00;
        }

        .plan-action {
          margin-top: auto;
        }

        .action-btn {
          width: 100%;
          padding: 16px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .current-plan {
          background: #333;
          color: #888;
          cursor: default;
        }

        .upgrade-btn {
          background: #333;
          color: white;
          border: 2px solid #555;
        }

        .upgrade-btn:hover {
          background: #555;
          border-color: #777;
        }

        .featured-btn {
          background: #00ff00;
          color: black;
          font-weight: 700;
        }

        .featured-btn:hover {
          background: #00cc00;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 255, 0, 0.3);
        }

        .btn-icon {
          width: 16px;
          height: 16px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .trust-section {
          background: #0a0a0a;
          padding: 60px 20px;
          border-top: 1px solid #333;
        }

        .trust-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .trust-content h3 {
          font-size: 1.5rem;
          margin-bottom: 32px;
          color: #ccc;
        }

        .trust-items {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 32px;
        }

        .trust-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
        }

        .trust-icon {
          width: 48px;
          height: 48px;
          color: #00ff00;
        }

        .trust-item h4 {
          margin: 0;
          font-size: 1.1rem;
          color: white;
        }

        .trust-item p {
          margin: 0;
          color: #888;
          font-size: 0.9rem;
        }

        .error-banner {
          background: #ff3333;
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 20px;
          border-radius: 8px;
        }

        .error-icon {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 768px) {
          .subscription-hero h1 {
            font-size: 2rem;
          }
          
          .plans-grid {
            grid-template-columns: 1fr;
          }
          
          .plan-card.featured {
            transform: none;
          }
          
          .plan-card.featured:hover {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
};

export default SubscriptionManager;
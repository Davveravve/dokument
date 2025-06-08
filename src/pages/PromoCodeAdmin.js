// src/pages/PromoCodeAdmin.js - Admin för rabattkoder
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const PromoCodeAdmin = () => {
  const { currentUser } = useAuth();
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount: 10,
    description: '',
    expiryDate: '',
    maxUses: '',
    active: true
  });
  const [editing, setEditing] = useState(null);

  // Kontrollera om användaren är admin (din email)
  const isAdmin = currentUser?.email === 'davveravve@gmail.com';

  useEffect(() => {
    if (isAdmin) {
      fetchPromoCodes();
    }
  }, [isAdmin]);

  const fetchPromoCodes = async () => {
    try {
      const promoSnapshot = await getDocs(collection(db, 'promoCodes'));
      const promoList = promoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expiryDate: doc.data().expiryDate?.toDate()
      }));
      setPromoCodes(promoList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (error) {
      console.error('Error fetching promo codes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const promoData = {
        code: formData.code.toUpperCase(),
        discount: parseInt(formData.discount),
        description: formData.description,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
        active: formData.active,
        usedCount: 0,
        usedBy: [],
        createdAt: serverTimestamp(),
        createdBy: currentUser.email
      };

      if (editing) {
        // Uppdatera befintlig rabattkod
        await updateDoc(doc(db, 'promoCodes', editing), {
          ...promoData,
          updatedAt: serverTimestamp()
        });
        console.log('✅ Promo code updated');
      } else {
        // Skapa ny rabattkod med kod som document ID
        await addDoc(collection(db, 'promoCodes'), promoData);
        console.log('✅ Promo code created');
      }

      // Återställ formulär
      setFormData({
        code: '',
        discount: 10,
        description: '',
        expiryDate: '',
        maxUses: '',
        active: true
      });
      setEditing(null);
      fetchPromoCodes();
    } catch (error) {
      console.error('Error saving promo code:', error);
      alert('Kunde inte spara rabattkod: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promo) => {
    setFormData({
      code: promo.code,
      discount: promo.discount,
      description: promo.description,
      expiryDate: promo.expiryDate ? promo.expiryDate.toISOString().split('T')[0] : '',
      maxUses: promo.maxUses || '',
      active: promo.active
    });
    setEditing(promo.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill ta bort denna rabattkod?')) {
      try {
        await deleteDoc(doc(db, 'promoCodes', id));
        console.log('✅ Promo code deleted');
        fetchPromoCodes();
      } catch (error) {
        console.error('Error deleting promo code:', error);
        alert('Kunde inte ta bort rabattkod');
      }
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'promoCodes', id), {
        active: !currentStatus,
        updatedAt: serverTimestamp()
      });
      fetchPromoCodes();
    } catch (error) {
      console.error('Error toggling promo code:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h3>Åtkomst nekad</h3>
          <p>Du har inte behörighet att komma åt denna sida.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h2>Rabattkoder Admin</h2>
          <p className="header-subtitle">
            Skapa och hantera rabattkoder för DubbelCheck
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="promo-admin">
          {/* Formulär för att skapa/redigera rabattkoder */}
          <div className="promo-form-section">
            <h3>{editing ? 'Redigera rabattkod' : 'Skapa ny rabattkod'}</h3>
            <form onSubmit={handleSubmit} className="promo-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="code">Rabattkod *</label>
                  <input
                    type="text"
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="SUMMER2025"
                    required
                    disabled={loading}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="discount">Rabatt (%) *</label>
                  <input
                    type="number"
                    id="discount"
                    value={formData.discount}
                    onChange={(e) => setFormData({...formData, discount: e.target.value})}
                    min="1"
                    max="100"
                    required
                    disabled={loading}
                  />
                  <small>100% = Gratis Pro-abonnemang</small>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Beskrivning *</label>
                  <input
                    type="text"
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Sommarrabatt 2025"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expiryDate">Utgångsdatum</label>
                  <input
                    type="date"
                    id="expiryDate"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                    disabled={loading}
                  />
                  <small>Lämna tomt för ingen utgång</small>
                </div>

                <div className="form-group">
                  <label htmlFor="maxUses">Max användningar</label>
                  <input
                    type="number"
                    id="maxUses"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({...formData, maxUses: e.target.value})}
                    placeholder="100"
                    min="1"
                    disabled={loading}
                  />
                  <small>Lämna tomt för obegränsat</small>
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({...formData, active: e.target.checked})}
                      disabled={loading}
                    />
                    <span>Aktiv rabattkod</span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setFormData({
                        code: '',
                        discount: 10,
                        description: '',
                        expiryDate: '',
                        maxUses: '',
                        active: true
                      });
                    }}
                    className="button secondary"
                    disabled={loading}
                  >
                    Avbryt
                  </button>
                )}
                <button
                  type="submit"
                  className="button primary"
                  disabled={loading}
                >
                  {loading ? 'Sparar...' : editing ? 'Uppdatera' : 'Skapa rabattkod'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista över befintliga rabattkoder */}
          <div className="promo-list-section">
            <h3>Befintliga rabattkoder ({promoCodes.length})</h3>
            {promoCodes.length === 0 ? (
              <div className="empty-state">
                <p>Inga rabattkoder skapade än</p>
              </div>
            ) : (
              <div className="promo-list">
                {promoCodes.map(promo => (
                  <div key={promo.id} className={`promo-card ${!promo.active ? 'inactive' : ''}`}>
                    <div className="promo-card-header">
                      <div className="promo-code-info">
                        <h4>{promo.code}</h4>
                        <p>{promo.description}</p>
                      </div>
                      <div className="promo-status">
                        <span className={`status-badge ${promo.active ? 'active' : 'inactive'}`}>
                          {promo.active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                    </div>

                    <div className="promo-card-details">
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Rabatt</label>
                          <span className="discount-value">{promo.discount}%</span>
                        </div>
                        <div className="detail-item">
                          <label>Används</label>
                          <span>{promo.usedCount || 0}{promo.maxUses ? ` / ${promo.maxUses}` : ' / ∞'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Utgår</label>
                          <span>
                            {promo.expiryDate 
                              ? promo.expiryDate.toLocaleDateString('sv-SE')
                              : 'Aldrig'
                            }
                          </span>
                        </div>
                        <div className="detail-item">
                          <label>Skapad</label>
                          <span>
                            {promo.createdAt?.seconds 
                              ? new Date(promo.createdAt.seconds * 1000).toLocaleDateString('sv-SE')
                              : 'Okänt'
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="promo-card-actions">
                      <button
                        onClick={() => handleEdit(promo)}
                        className="action-btn edit"
                        disabled={loading}
                      >
                        Redigera
                      </button>
                      <button
                        onClick={() => toggleActive(promo.id, promo.active)}
                        className={`action-btn ${promo.active ? 'deactivate' : 'activate'}`}
                        disabled={loading}
                      >
                        {promo.active ? 'Inaktivera' : 'Aktivera'}
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="action-btn delete"
                        disabled={loading}
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .promo-admin {
          max-width: 1000px;
          margin: 0 auto;
        }

        .promo-form-section {
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          padding: var(--space-xl);
          margin-bottom: var(--space-xl);
        }

        .promo-form-section h3 {
          margin-bottom: var(--space-lg);
          color: var(--white);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: var(--space-sm);
          color: var(--text-color-light);
          font-weight: var(--font-weight-medium);
        }

        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group input[type="date"] {
          padding: var(--space-md);
          border: var(--border);
          border-radius: var(--radius-sm);
          background-color: var(--dark-700);
          color: var(--text-color);
          font-size: var(--font-size-md);
        }

        .form-group input:disabled {
          background-color: var(--dark-600);
          cursor: not-allowed;
        }

        .form-group small {
          color: var(--text-color-muted);
          margin-top: var(--space-xs);
          font-size: var(--font-size-sm);
        }

        .full-width {
          grid-column: 1 / -1; /* Spans across all columns */
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-color);
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--primary); /* Styles the checkbox itself */
          cursor: pointer;
        }

        .form-actions {
          display: flex;
          gap: var(--space-md);
          justify-content: flex-end;
          padding-top: var(--space-md);
          border-top: 1px solid var(--dark-700);
          margin-top: var(--space-xl);
        }

        .button {
          padding: var(--space-md) var(--space-lg);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-weight: var(--font-weight-bold);
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        .button.primary {
          background-color: var(--primary);
          color: var(--white);
          border: 1px solid var(--primary);
        }

        .button.primary:hover:not(:disabled) {
          background-color: var(--primary-dark);
          border-color: var(--primary-dark);
        }

        .button.secondary {
          background-color: transparent;
          color: var(--text-color-light);
          border: 1px solid var(--dark-500);
        }

        .button.secondary:hover:not(:disabled) {
          background-color: var(--dark-700);
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Promo List Styling */
        .promo-list-section {
          margin-top: var(--space-xl);
        }

        .promo-list-section h3 {
          margin-bottom: var(--space-lg);
          color: var(--white);
        }

        .promo-list {
          display: grid;
          gap: var(--space-lg);
        }

        .promo-card {
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          transition: border-color 0.2s ease;
        }

        .promo-card.inactive {
          opacity: 0.7;
          border-color: var(--dark-600);
        }

        .promo-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--space-md);
        }

        .promo-code-info h4 {
          margin: 0;
          color: var(--primary);
          font-size: var(--font-size-xl);
          word-break: break-all;
        }

        .promo-code-info p {
          margin: var(--space-xs) 0 0;
          color: var(--text-color-light);
          font-size: var(--font-size-md);
        }

        .promo-status .status-badge {
          display: inline-block;
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          font-weight: var(--font-weight-bold);
          text-transform: uppercase;
        }

        .status-badge.active {
          background-color: var(--success-bg);
          color: var(--success-text);
        }

        .status-badge.inactive {
          background-color: var(--warning-bg);
          color: var(--warning-text);
        }

        .promo-card-details {
          padding: var(--space-md) 0;
          border-top: 1px solid var(--dark-700);
          border-bottom: 1px solid var(--dark-700);
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: var(--space-md);
        }

        .detail-item {
          display: flex;
          flex-direction: column;
        }

        .detail-item label {
          color: var(--text-color-muted);
          font-size: var(--font-size-sm);
          margin-bottom: var(--space-xs);
        }

        .detail-item span {
          color: var(--text-color);
          font-weight: var(--font-weight-medium);
          font-size: var(--font-size-md);
        }

        .detail-item .discount-value {
          color: var(--info); /* Example color for discount */
        }

        .promo-card-actions {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
          margin-top: var(--space-md);
        }

        .action-btn {
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-weight: var(--font-weight-medium);
          border: 1px solid transparent;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          white-space: nowrap; /* Prevent button text from wrapping */
        }

        .action-btn.edit {
          background-color: var(--accent);
          color: var(--white);
        }

        .action-btn.edit:hover:not(:disabled) {
          background-color: var(--accent-dark);
        }

        .action-btn.deactivate {
          background-color: var(--warning);
          color: var(--dark-900);
        }

        .action-btn.deactivate:hover:not(:disabled) {
          background-color: var(--warning-dark);
        }

        .action-btn.activate {
          background-color: var(--success);
          color: var(--dark-900);
        }

        .action-btn.activate:hover:not(:disabled) {
          background-color: var(--success-dark);
        }

        .action-btn.delete {
          background-color: var(--danger);
          color: var(--white);
        }

        .action-btn.delete:hover:not(:disabled) {
          background-color: var(--danger-dark);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: var(--space-xl);
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          color: var(--text-color-muted);
        }

        .empty-state p {
          margin: 0;
          font-size: var(--font-size-lg);
        }

        /* Global Page Container Styling (assuming these exist or will be added) */
        .page-container {
          padding: var(--space-xxl) var(--space-md);
          min-height: calc(100vh - var(--header-height, 0)); /* Adjust based on your header height */
          background-color: var(--dark-900);
          color: var(--text-color);
        }

        .page-header {
          margin-bottom: var(--space-xl);
          text-align: center;
        }

        .page-header h2 {
          font-size: var(--font-size-xxl);
          color: var(--white);
          margin-bottom: var(--space-sm);
        }

        .page-header .header-subtitle {
          color: var(--text-color-light);
          font-size: var(--font-size-lg);
          margin: 0;
        }

        .page-content {
          padding: var(--space-md) 0;
        }

        .error-state {
          text-align: center;
          background: var(--dark-800);
          border: 1px solid var(--danger);
          border-radius: var(--radius);
          padding: var(--space-xxl);
          margin: var(--space-xxl) auto;
          max-width: 600px;
        }

        .error-state h3 {
          color: var(--danger);
          margin-bottom: var(--space-md);
        }

        .error-state p {
          color: var(--text-color-light);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr; /* Stack columns on smaller screens */
          }
        }
      `}</style>
    </div>
  );
};

export default PromoCodeAdmin;
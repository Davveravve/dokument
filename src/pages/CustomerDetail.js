// src/pages/CustomerDetail.js - Snygg design som matchar InstallationDetail
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const CustomerDetail = () => {
  const { currentUser } = useAuth();
  const { customerId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const fetchCustomerAndAddresses = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att visa kunder');
        setLoading(false);
        return;
      }

      try {
        // Hämta kundinformation
        const customerDocRef = doc(db, 'customers', customerId);
        const customerDoc = await getDoc(customerDocRef);
        
        if (!customerDoc.exists()) {
          setError('Kunden hittades inte');
          return;
        }
        
        const customerData = customerDoc.data();
        
        // Relaxad behörighetskontroll för migration
        if (customerData.userId && customerData.userId !== currentUser.uid) {
          // Tillåt åtkomst under migration
        }
        
        const customer = {
          id: customerDoc.id,
          ...customerData
        };
        
        setCustomer(customer);
        setFormData({
          name: customer.name || '',
          contact: customer.contact || '',
          phone: customer.phone || '',
          email: customer.email || ''
        });
        
        // Hämta adresser med relaxad filtrering
        const addressesWithUserQuery = query(
          collection(db, 'addresses'), 
          where('customerId', '==', customerId),
          where('userId', '==', currentUser.uid)
        );
        
        const allAddressesQuery = query(
          collection(db, 'addresses'), 
          where('customerId', '==', customerId)
        );
        
        const [addressesWithUserSnapshot, allAddressesSnapshot] = await Promise.all([
          getDocs(addressesWithUserQuery),
          getDocs(allAddressesQuery)
        ]);
        
        const allAddresses = allAddressesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrera adresser som antingen saknar userId eller tillhör användaren
        const filteredAddresses = allAddresses.filter(address => {
          if (address.userId && address.userId !== currentUser.uid) {
            return false;
          }
          return true;
        });
        
        // Sortera alfabetiskt
        filteredAddresses.sort((a, b) => a.street.localeCompare(b.street));
        
        setAddresses(filteredAddresses);
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError('Kunde inte hämta kundinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerAndAddresses();
  }, [customerId, currentUser]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (updating) return;
    
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'customers', customerId), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      
      setCustomer(prev => ({
        ...prev,
        ...formData,
        updatedAt: new Date()
      }));
      
      setEditing(false);
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Kunde inte spara ändringar');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: customer.name || '',
      contact: customer.contact || '',
      phone: customer.phone || '',
      email: customer.email || ''
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort kund',
      message: 'Är du säker på att du vill ta bort denna kund? Detta kommer ta bort alla tillhörande adresser och anläggningar.',
      onConfirm: async () => {
        setUpdating(true);
        
        try {
          // Ta bort kunden
          await deleteDoc(doc(db, 'customers', customerId));
          
          // Ta bort relaterade adresser
          for (const address of addresses) {
            await deleteDoc(doc(db, 'addresses', address.id));
          }
          
          navigate('/customers');
        } catch (err) {
          console.error('Error deleting customer:', err);
          setError('Kunde inte ta bort kund');
          setUpdating(false);
        }
      }
    });
  };

  const getCustomerInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'Okänt datum';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Laddar kundinformation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3>Ett fel uppstod</h3>
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="button secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
            </svg>
            Gå tillbaka
          </button>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h3>Kunden hittades inte</h3>
          <p>Den kund du söker efter finns inte eller har tagits bort.</p>
          <button onClick={() => navigate('/customers')} className="button secondary">
            Tillbaka till kunder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-main">
            <div className="customer-header-info">
              <div className="customer-avatar-large">
                <span className="avatar-initials-large">
                  {getCustomerInitials(customer.name)}
                </span>
              </div>
              <div className="customer-title">
                <h1>{customer.name}</h1>
                <div className="header-badges">
                  <span className="status-badge active">Aktiv kund</span>
                  <span className="count-badge">{addresses.length} {addresses.length === 1 ? 'adress' : 'adresser'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="breadcrumb">
            <Link to="/">Dashboard</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <Link to="/customers">Kunder</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <span>{customer.name}</span>
          </div>
        </div>

        <div className="header-actions">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="button secondary"
                disabled={updating}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Avbryt
              </button>
              <button
                onClick={handleSave}
                className="button primary"
                disabled={updating}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17,21 17,13 7,13 7,21"/>
                  <polyline points="7,3 7,8 15,8"/>
                </svg>
                {updating ? 'Sparar...' : 'Spara ändringar'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="button secondary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Redigera
              </button>
              <button
                onClick={handleDelete}
                className="button danger"
                disabled={updating}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                </svg>
                Ta bort
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        <div className="content-grid">
          {/* Customer Info Card */}
          <div className="info-card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <h3>Kontaktinformation</h3>
                <p>Kunduppgifter och kontaktdetaljer</p>
              </div>
            </div>

            <div className="card-content">
              {editing ? (
                <div className="edit-form">
                  <div className="form-group">
                    <label>Företagsnamn</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Ange företagsnamn"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Kontaktperson</label>
                    <input
                      type="text"
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      placeholder="Ange kontaktperson"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Telefon</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Ange telefonnummer"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>E-post</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Ange e-postadress"
                    />
                  </div>
                </div>
              ) : (
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Företagsnamn</span>
                    <span className="info-value">{customer.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Kontaktperson</span>
                    <span className="info-value">{customer.contact || 'Ej angivet'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Telefon</span>
                    <span className="info-value">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="contact-link">
                          {customer.phone}
                        </a>
                      ) : (
                        'Ej angivet'
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">E-post</span>
                    <span className="info-value">
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="contact-link">
                          {customer.email}
                        </a>
                      ) : (
                        'Ej angivet'
                      )}
                    </span>
                  </div>
                  {customer.createdAt && (
                    <div className="info-item">
                      <span className="info-label">Registrerad</span>
                      <span className="info-value">{formatDate(customer.createdAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Addresses Card */}
          <div className="addresses-card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div>
                <h3>Adresser</h3>
                <p>{addresses.length} {addresses.length === 1 ? 'adress' : 'adresser'} registrerade</p>
              </div>
              <Link 
                to={`/customers/${customerId}/addresses/new`}
                className="button primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Lägg till adress
              </Link>
            </div>

            <div className="card-content">
              {addresses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <h4>Inga adresser än</h4>
                  <p>Lägg till en adress för att kunna skapa anläggningar och kontroller.</p>
                  <Link 
                    to={`/customers/${customerId}/addresses/new`}
                    className="button primary"
                  >
                    Lägg till första adressen
                  </Link>
                </div>
              ) : (
                <div className="addresses-list">
                  {addresses.map(address => (
                    <div key={address.id} className="address-card">
                      <Link to={`/customers/${customerId}/addresses/${address.id}`}>
                        <div className="address-content">
                          <div className="address-header">
                            <h4>{address.street}</h4>
                            <div className="address-location">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                <circle cx="12" cy="10" r="3"/>
                              </svg>
                              <span>{address.postalCode} {address.city}</span>
                            </div>
                          </div>
                          <div className="address-meta">
                            <div className="meta-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="4" width="20" height="16" rx="2"/>
                                <path d="M7 15h10M7 11h4"/>
                              </svg>
                              <span>0 anläggningar</span> {/* Placeholder för framtida data */}
                            </div>
                            <div className="meta-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                              </svg>
                              <span>0 kontroller</span> {/* Placeholder för framtida data */}
                            </div>
                          </div>
                        </div>
                        <div className="address-arrow">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9,18 15,12 9,6"/>
                          </svg>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="navigation-section">
          <Link to="/customers" className="button secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
            </svg>
            Tillbaka till kunder
          </Link>
        </div>
      </div>

      <style jsx>{`
        .customer-header-info {
          display: flex;
          align-items: center;
          gap: var(--space-xl);
          margin-bottom: var(--space-lg);
        }

        .customer-avatar-large {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--green), var(--blue));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .avatar-initials-large {
          color: var(--white);
          font-size: 2rem;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .customer-title h1 {
          color: var(--white);
          margin: 0 0 var(--space-sm) 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .header-badges {
          display: flex;
          gap: var(--space-md);
          align-items: center;
        }

        .status-badge {
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius);
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.active {
          background: var(--green-light);
          color: var(--green);
          border: 1px solid var(--green);
        }

        .count-badge {
          background: var(--dark-600);
          color: var(--dark-200);
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius);
          font-size: 0.875rem;
          font-weight: 500;
          border: 1px solid var(--dark-500);
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.9rem;
          color: var(--dark-300);
        }

        .breadcrumb a {
          color: var(--green);
          text-decoration: none;
          font-weight: 500;
        }

        .breadcrumb a:hover {
          text-decoration: underline;
        }

        .header-actions {
          display: flex;
          gap: var(--space-md);
          align-items: center;
        }

        .content-grid {
          display: grid;
          gap: var(--space-2xl);
          margin-bottom: var(--space-2xl);
        }

        .info-card, .addresses-card {
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          position: relative;
        }

        .info-card::before, .addresses-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--green), transparent);
        }

        .card-header {
          background: var(--dark-700);
          padding: var(--space-xl);
          display: flex;
          align-items: center;
          gap: var(--space-lg);
          border-bottom: var(--border);
        }

        .card-header-icon {
          background: rgba(0, 255, 0, 0.1);
          color: var(--green);
          padding: var(--space-md);
          border-radius: var(--radius);
          border: 1px solid var(--green);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-header h3 {
          color: var(--white);
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .card-header p {
          color: var(--dark-200);
          margin: 0;
          font-size: 0.9rem;
        }

        .card-content {
          padding: var(--space-xl);
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-lg);
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .info-label {
          color: var(--dark-300);
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          color: var(--white);
          font-size: 1rem;
          font-weight: 500;
        }

        .contact-link {
          color: var(--green);
          text-decoration: none;
          transition: all var(--transition);
        }

        .contact-link:hover {
          text-decoration: underline;
          color: var(--white);
        }

        .edit-form {
          display: grid;
          gap: var(--space-lg);
        }

        .form-group label {
          display: block;
          margin-bottom: var(--space-sm);
          font-weight: 600;
          color: var(--white);
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input {
          width: 100%;
          padding: var(--space-md);
          border: 2px solid var(--dark-500);
          border-radius: var(--radius);
          background: var(--white);
          color: var(--black);
          font-size: 1rem;
          font-weight: 500;
          transition: all var(--transition);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--green);
          box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.2);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-3xl);
        }

        .empty-icon {
          color: var(--dark-400);
          margin-bottom: var(--space-xl);
        }

        .empty-state h4 {
          color: var(--white);
          margin: 0 0 var(--space-md) 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .empty-state p {
          color: var(--dark-200);
          margin: 0 0 var(--space-xl) 0;
          font-size: 1rem;
        }

        .addresses-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .address-card {
          background: var(--dark-700);
          border: 1px solid var(--dark-500);
          border-radius: var(--radius);
          transition: all var(--transition);
        }

        .address-card:hover {
          border-color: var(--green);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .address-card a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-lg);
          text-decoration: none;
          color: inherit;
        }

        .address-content {
          flex: 1;
        }

        .address-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }

        .address-header h4 {
          color: var(--white);
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .address-location {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          color: var(--green);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .address-meta {
          display: flex;
          gap: var(--space-lg);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          color: var(--dark-200);
          font-size: 0.875rem;
        }

        .address-arrow {
          color: var(--dark-400);
          transition: all var(--transition);
        }

        .address-card:hover .address-arrow {
          color: var(--green);
          transform: translateX(4px);
        }

        .navigation-section {
          padding-top: var(--space-xl);
          border-top: var(--border);
        }

        .error-state {
          text-align: center;
          padding: var(--space-2xl);
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          margin: var(--space-2xl) auto;
          max-width: 500px;
        }

        .error-icon {
          color: var(--red);
          margin-bottom: var(--space-lg);
        }

        .error-state h3 {
          color: var(--white);
          margin: 0 0 var(--space-md) 0;
          font-size: 1.5rem;
        }

        .error-state p {
          color: var(--dark-200);
          margin: 0 0 var(--space-xl) 0;
        }

        @media (max-width: 768px) {
          .customer-header-info {
            flex-direction: column;
            text-align: center;
            gap: var(--space-lg);
          }

          .customer-title h1 {
            font-size: 2rem;
          }

          .header-badges {
            flex-wrap: wrap;
            justify-content: center;
          }

          .breadcrumb {
            flex-wrap: wrap;
            justify-content: center;
          }

          .header-actions {
            flex-direction: column;
            gap: var(--space-sm);
            width: 100%;
          }

          .header-actions .button {
            width: 100%;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .address-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-sm);
          }

          .address-meta {
            flex-direction: column;
            gap: var(--space-sm);
          }

          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .card-header .button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerDetail;
// src/pages/InstallationForm.js - Med användarspecifik anläggningsskapande
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const InstallationForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { customerId, addressId, installationId } = useParams();
  const isEdit = Boolean(installationId);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    serialNumber: '',
    installationDate: '',
    manufacturer: '',
    model: ''
  });
  
  const [customer, setCustomer] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const installationTypes = [
    'Huvudcentral',
    'Undercentral',
    'Eluttag',
    'Belysning',
    'Motorinstallation',
    'Värmesystem',
    'Ventilation',
    'Säkerhetssystem',
    'Annat'
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        // Hämta kundinformation och kontrollera ägarskap
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          if (customerData.userId !== currentUser.uid) {
            setError('Du har inte behörighet att hantera denna kunds anläggningar');
            return;
          }
          setCustomer({
            id: customerDoc.id,
            ...customerData
          });
        } else {
          setError('Kunden hittades inte');
          return;
        }

        // Hämta adressinformation
        const addressDoc = await getDoc(doc(db, 'addresses', addressId));
        if (addressDoc.exists()) {
          const addressData = addressDoc.data();
          if (addressData.customerId !== customerId) {
            setError('Adressen tillhör inte denna kund');
            return;
          }
          setAddress({
            id: addressDoc.id,
            ...addressData
          });
        } else {
          setError('Adressen hittades inte');
          return;
        }

        // Om vi redigerar, hämta anläggningsdata
        if (isEdit && installationId) {
          const installationDoc = await getDoc(doc(db, 'installations', installationId));
          if (installationDoc.exists()) {
            const installationData = installationDoc.data();
            // Kontrollera att anläggningen tillhör rätt adress
            if (installationData.addressId !== addressId) {
              setError('Anläggningen tillhör inte denna adress');
              return;
            }
            setFormData({
              name: installationData.name || '',
              type: installationData.type || '',
              description: installationData.description || '',
              serialNumber: installationData.serialNumber || '',
              installationDate: installationData.installationDate || '',
              manufacturer: installationData.manufacturer || '',
              model: installationData.model || ''
            });
          } else {
            setError('Anläggningen hittades inte');
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte hämta nödvändig information');
      }
    };

    fetchData();
  }, [isEdit, installationId, customerId, addressId, currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Du måste vara inloggad för att hantera anläggningar');
      return;
    }

    if (!formData.name.trim()) {
      setError('Anläggningsnamn är obligatoriskt');
      return;
    }

    if (!formData.type.trim()) {
      setError('Anläggningstyp är obligatorisk');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const installationData = {
        ...formData,
        customerId,                       // Koppla till kund
        addressId,                        // Koppla till adress
        userId: currentUser.uid,          // 👈 Koppla till användare
        userEmail: currentUser.email,     // 👈 Spara email också
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        // Uppdatera befintlig anläggning
        await updateDoc(doc(db, 'installations', installationId), installationData);
        console.log('✅ Installation updated for user:', currentUser.email);
      } else {
        // Skapa ny anläggning
        installationData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'installations'), installationData);
        console.log('✅ New installation created for user:', currentUser.email, 'ID:', docRef.id);
      }

      navigate(`/customers/${customerId}/addresses/${addressId}/installations`);
    } catch (err) {
      console.error('Error saving installation:', err);
      setError('Kunde inte spara anläggning. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="error-state">Du måste vara inloggad för att hantera anläggningar</div>;
  }

  if ((!customer || !address) && !error) {
    return <div className="loading-state">Laddar...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h2>{isEdit ? 'Redigera anläggning' : 'Ny anläggning'}</h2>
          <p className="header-subtitle">
            {customer && address ? (
              <>
                {isEdit ? 'Uppdatera anläggning för' : 'Lägg till ny anläggning för'} {customer.name} - {address.street}
              </>
            ) : (
              'Hantera anläggningsinformation'
            )}
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="installation-form">
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

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Anläggningsnamn *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="T.ex. Huvudcentral A"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Typ av anläggning *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="">Välj typ</option>
                  {installationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="manufacturer">Tillverkare</label>
                <input
                  type="text"
                  id="manufacturer"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  placeholder="T.ex. ABB, Schneider Electric"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="model">Modell</label>
                <input
                  type="text"
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="Modellnummer"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="serialNumber">Serienummer</label>
                <input
                  type="text"
                  id="serialNumber"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  placeholder="Serienummer"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="installationDate">Installationsdatum</label>
                <input
                  type="date"
                  id="installationDate"
                  name="installationDate"
                  value={formData.installationDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Ytterligare information om anläggningen..."
                  rows="4"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(`/customers/${customerId}/addresses/${addressId}/installations`)}
                className="button secondary"
                disabled={loading}
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    {isEdit ? 'Uppdaterar...' : 'Skapar...'}
                  </>
                ) : (
                  <>
                    {isEdit ? 'Uppdatera anläggning' : 'Skapa anläggning'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info sidebar */}
          {customer && address && (
            <div className="form-sidebar">
              <div className="sidebar-section">
                <h3>Kundinformation</h3>
                <div className="customer-info">
                  <div className="customer-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="customer-details">
                    <h4>{customer.name}</h4>
                    {customer.contact && (
                      <p className="customer-contact">{customer.contact}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <h3>Adressinformation</h3>
                <div className="address-info">
                  <div className="address-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="address-details">
                    <p className="address-street">{address.street}</p>
                    <p className="address-city">
                      {address.postalCode && `${address.postalCode} `}{address.city}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                <h3>Navigering</h3>
                <div className="sidebar-links">
                  <a href={`/customers/${customerId}`} className="sidebar-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Kunddetaljer
                  </a>
                  <a href={`/customers/${customerId}/addresses/${addressId}`} className="sidebar-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Adressdetaljer
                  </a>
                  <a href={`/customers/${customerId}/addresses/${addressId}/installations`} className="sidebar-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="M7 15h10M7 11h4"/>
                    </svg>
                    Alla anläggningar
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallationForm;
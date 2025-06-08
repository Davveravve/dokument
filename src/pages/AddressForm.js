// src/pages/AddressForm.js - Med användarspecifik adressskapande
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const AddressForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { customerId, addressId } = useParams();
  const isEdit = Boolean(addressId);
  
  const [formData, setFormData] = useState({
    street: '',
    postalCode: '',
    city: '',
    description: ''
  });
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        // Hämta kundinformation och kontrollera ägarskap
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          if (customerData.userId !== currentUser.uid) {
            setError('Du har inte behörighet att hantera denna kunds adresser');
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

        // Om vi redigerar, hämta adressdata
        if (isEdit && addressId) {
          const addressDoc = await getDoc(doc(db, 'addresses', addressId));
          if (addressDoc.exists()) {
            const addressData = addressDoc.data();
            // Kontrollera att adressen tillhör användaren via customerId
            if (addressData.customerId !== customerId) {
              setError('Adressen tillhör inte denna kund');
              return;
            }
            setFormData({
              street: addressData.street || '',
              postalCode: addressData.postalCode || '',
              city: addressData.city || '',
              description: addressData.description || ''
            });
          } else {
            setError('Adressen hittades inte');
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte hämta nödvändig information');
      }
    };

    fetchData();
  }, [isEdit, addressId, customerId, currentUser]);

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
      setError('Du måste vara inloggad för att hantera adresser');
      return;
    }

    if (!formData.street.trim()) {
      setError('Gatuadress är obligatorisk');
      return;
    }

    if (!formData.city.trim()) {
      setError('Stad är obligatorisk');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const addressData = {
        ...formData,
        customerId,                       // Koppla till kund
        userId: currentUser.uid,          // 👈 Koppla till användare
        userEmail: currentUser.email,     // 👈 Spara email också
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        // Uppdatera befintlig adress
        await updateDoc(doc(db, 'addresses', addressId), addressData);
        console.log('✅ Address updated for user:', currentUser.email);
      } else {
        // Skapa ny adress
        addressData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'addresses'), addressData);
        console.log('✅ New address created for user:', currentUser.email, 'ID:', docRef.id);
      }

      navigate(`/customers/${customerId}/addresses`);
    } catch (err) {
      console.error('Error saving address:', err);
      setError('Kunde inte spara adress. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="error-state">Du måste vara inloggad för att hantera adresser</div>;
  }

  if (!customer && !error) {
    return <div className="loading-state">Laddar...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h2>{isEdit ? 'Redigera adress' : 'Ny adress'}</h2>
          <p className="header-subtitle">
            {customer ? (
              <>
                {isEdit ? 'Uppdatera adress för' : 'Lägg till ny adress för'} {customer.name}
              </>
            ) : (
              'Hantera adressinformation'
            )}
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="address-form">
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
              <div className="form-group full-width">
                <label htmlFor="street">Gatuadress *</label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="Exempelgatan 123"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Postnummer</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="123 45"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">Stad *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Stockholm"
                  required
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
                  placeholder="Ytterligare information om adressen..."
                  rows="3"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate(`/customers/${customerId}/addresses`)}
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
                    {isEdit ? 'Uppdatera adress' : 'Skapa adress'}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Kund-info sidebar */}
          {customer && (
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
                    {customer.email && (
                      <p className="customer-email">{customer.email}</p>
                    )}
                    {customer.phone && (
                      <p className="customer-phone">{customer.phone}</p>
                    )}
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
                  <a href={`/customers/${customerId}/addresses`} className="sidebar-link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Alla adresser
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

export default AddressForm;
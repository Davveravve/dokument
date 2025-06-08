// src/pages/CustomerForm.js - Med användarspecifik data
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const CustomerForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { customerId } = useParams();
  const isEdit = Boolean(customerId);
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && customerId) {
      const fetchCustomer = async () => {
        try {
          const customerDoc = await getDoc(doc(db, 'customers', customerId));
          if (customerDoc.exists()) {
            const data = customerDoc.data();
            // Kontrollera att kunden tillhör inloggad användare
            if (data.userId !== currentUser.uid) {
              setError('Du har inte behörighet att redigera denna kund');
              return;
            }
            setFormData({
              name: data.name || '',
              contact: data.contact || '',
              phone: data.phone || '',
              email: data.email || ''
            });
          } else {
            setError('Kunden hittades inte');
          }
        } catch (err) {
          console.error('Error fetching customer:', err);
          setError('Kunde inte hämta kundinformation');
        }
      };
      
      fetchCustomer();
    }
  }, [isEdit, customerId, currentUser.uid]);

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
      setError('Du måste vara inloggad för att skapa kunder');
      return;
    }

    if (!formData.name.trim()) {
      setError('Kundnamn är obligatoriskt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const customerData = {
        ...formData,
        userId: currentUser.uid,           // 👈 Koppla till användare
        userEmail: currentUser.email,     // 👈 Spara email också
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        // Uppdatera befintlig kund
        await updateDoc(doc(db, 'customers', customerId), customerData);
        console.log('✅ Customer updated for user:', currentUser.email);
      } else {
        // Skapa ny kund
        customerData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'customers'), customerData);
        console.log('✅ New customer created for user:', currentUser.email, 'ID:', docRef.id);
      }

      navigate('/customers');
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('Kunde inte spara kund. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="error-state">Du måste vara inloggad för att hantera kunder</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h2>{isEdit ? 'Redigera kund' : 'Ny kund'}</h2>
          <p className="header-subtitle">
            {isEdit ? 'Uppdatera kundinformation' : 'Lägg till en ny kund i systemet'}
          </p>
        </div>
      </div>

      <div className="page-content">
        <div className="form-container">
          <form onSubmit={handleSubmit} className="customer-form">
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
                <label htmlFor="name">Kundnamn *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Företagsnamn eller privatperson"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact">Kontaktperson</label>
                <input
                  type="text"
                  id="contact"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="Namn på kontaktperson"
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
                <label htmlFor="email">E-postadress</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="kontakt@exempel.se"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/customers')}
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
                    {isEdit ? 'Uppdatera kund' : 'Skapa kund'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
// src/pages/CustomerForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const CustomerForm = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({
    name: '',
    contact: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomer(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validera att minst kundnamn är angivet
    if (!customer.name.trim()) {
      setError("Kundnamn måste anges");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Lägg till tidsstämplar och spara i Firestore
      const docRef = await addDoc(collection(db, 'customers'), {
        ...customer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log("Customer added with ID:", docRef.id);
      navigate(`/customers/${docRef.id}`);
    } catch (err) {
      console.error("Error adding customer:", err);
      setError("Kunde inte spara kunden. Försök igen senare.");
      setLoading(false);
    }
  };
  
  return (
    <div className="customer-form-container">
      <h2>Skapa ny kund</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Kundnamn *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={customer.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="contact">Kontaktperson</label>
          <input
            type="text"
            id="contact"
            name="contact"
            value={customer.contact}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Telefonnummer</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={customer.phone}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">E-post</label>
          <input
            type="email"
            id="email"
            name="email"
            value={customer.email}
            onChange={handleChange}
          />
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
            {loading ? 'Sparar...' : 'Spara kund'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
// src/pages/AddressForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const AddressForm = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [address, setAddress] = useState({
    street: '',
    postalCode: '',
    city: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        
        if (!customerDoc.exists()) {
          setError('Kunden hittades inte');
          return;
        }
        
        setCustomer({
          id: customerDoc.id,
          ...customerDoc.data()
        });
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError('Kunde inte hämta kundinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validera att obligatoriska fält är ifyllda
    if (!address.street.trim() || !address.city.trim()) {
      setError("Gatuadress och ort måste anges");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Lägg till ny adress i Firestore
      const docRef = await addDoc(collection(db, 'addresses'), {
        customerId,
        ...address,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      navigate(`/customers/${customerId}/addresses/${docRef.id}`);
    } catch (err) {
      console.error("Error adding address:", err);
      setError("Kunde inte spara adressen. Försök igen senare.");
      setSaving(false);
    }
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!customer) return <div>Kunden hittades inte</div>;

  return (
    <div className="address-form-container">
      <h2>Lägg till adress för {customer.name}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="street">Gatuadress *</label>
          <input
            type="text"
            id="street"
            name="street"
            value={address.street}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="postalCode">Postnummer</label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={address.postalCode}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="city">Ort *</label>
          <input
            type="text"
            id="city"
            name="city"
            value={address.city}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate(`/customers/${customerId}`)}
            className="button secondary"
            disabled={saving}
          >
            Avbryt
          </button>
          <button 
            type="submit" 
            className="button primary"
            disabled={saving}
          >
            {saving ? 'Sparar...' : 'Spara adress'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddressForm;
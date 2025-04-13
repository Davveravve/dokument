// src/pages/InstallationForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const InstallationForm = () => {
  const { customerId, addressId } = useParams();
  const navigate = useNavigate();
  const [address, setAddress] = useState(null);
  const [installation, setInstallation] = useState({
    name: '',
    description: '',
    status: 'pending' // Standardvärde
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const addressDoc = await getDoc(doc(db, 'addresses', addressId));
        
        if (!addressDoc.exists()) {
          setError('Adressen hittades inte');
          return;
        }
        
        setAddress({
          id: addressDoc.id,
          ...addressDoc.data()
        });
      } catch (err) {
        console.error('Error fetching address:', err);
        setError('Kunde inte hämta adressinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [addressId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInstallation(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validera att obligatoriska fält är ifyllda
    if (!installation.name.trim()) {
      setError("Anläggningsnamn måste anges");
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Lägg till ny anläggning i Firestore
      const docRef = await addDoc(collection(db, 'installations'), {
        addressId,
        customerId, // Spara också kund-ID för enklare filtrering
        ...installation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      navigate(`/customers/${customerId}/addresses/${addressId}/installations/${docRef.id}`);
    } catch (err) {
      console.error("Error adding installation:", err);
      setError("Kunde inte spara anläggningen. Försök igen senare.");
      setSaving(false);
    }
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!address) return <div>Adressen hittades inte</div>;

  return (
    <div className="installation-form-container">
      <h2>Lägg till anläggning</h2>
      <p>Adress: {address.street}, {address.postalCode} {address.city}</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Anläggningsnamn *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={installation.name}
            onChange={handleChange}
            required
            placeholder="T.ex. Huvudbyggnad, Garage, Lager"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Beskrivning</label>
          <textarea
            id="description"
            name="description"
            value={installation.description}
            onChange={handleChange}
            rows="3"
            placeholder="Frivillig beskrivning av anläggningen"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={installation.status}
            onChange={handleChange}
          >
            <option value="pending">Ej klar</option>
            <option value="completed">Klarmarkerad</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate(`/customers/${customerId}/addresses/${addressId}`)}
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
            {saving ? 'Sparar...' : 'Spara anläggning'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InstallationForm;
// src/pages/CustomerDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useConfirmation } from '../components/ConfirmationProvider';

const CustomerDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [customer, setCustomer] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const fetchCustomerAndAddresses = async () => {
      try {
        // Hämta kundinformation
        const customerDocRef = doc(db, 'customers', customerId);
        const customerDoc = await getDoc(customerDocRef);
        
        if (!customerDoc.exists()) {
          setError('Kunden hittades inte');
          setLoading(false);
          return;
        }
        
        const customerData = {
          id: customerDoc.id,
          ...customerDoc.data()
        };
        
        setCustomer(customerData);
        setFormData({
          name: customerData.name || '',
          contact: customerData.contact || '',
          phone: customerData.phone || '',
          email: customerData.email || ''
        });
        
        // Hämta adresser för kunden
        const addressesQuery = query(
          collection(db, 'addresses'), 
          where('customerId', '==', customerId)
        );
        
        const addressesSnapshot = await getDocs(addressesQuery);
        const addressesList = addressesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setAddresses(addressesList);
      } catch (err) {
        console.error('Error fetching customer:', err);
        setError('Kunde inte hämta kundinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerAndAddresses();
  }, [customerId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      
      setCustomer(prev => ({
        ...prev,
        ...formData,
        updatedAt: new Date() // Placeholder tills serverTimestamp uppdateras
      }));
      
      setEditing(false);
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Kunde inte uppdatera kund');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // Använder vår nya confirmation istället för window.confirm
    confirmation.confirm({
      title: 'Ta bort kund',
      message: 'Är du säker på att du vill ta bort denna kund? Detta kommer även ta bort alla adresser och anläggningar.',
      onConfirm: async () => {
        setLoading(true);
        
        try {
          // Ta bort kunden
          await deleteDoc(doc(db, 'customers', customerId));
          
          // Här skulle du idealt ha en Cloud Function som tar bort relaterade adresser och anläggningar
          // men för enklare implementationer kan du manuellt ta bort relaterade adresser
          for (const address of addresses) {
            await deleteDoc(doc(db, 'addresses', address.id));
            // Ta även bort relaterade anläggningar här om nödvändigt
          }
          
          navigate('/customers');
        } catch (err) {
          console.error('Error deleting customer:', err);
          setError('Kunde inte ta bort kund');
          setLoading(false);
        }
      }
    });
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!customer) return <div>Kunden hittades inte</div>;

  return (
    <div className="customer-detail">
      <div className="customer-header">
        <h2>{customer.name}</h2>
        <div className="action-buttons">
          {!editing ? (
            <>
              <button 
                onClick={() => setEditing(true)}
                className="button secondary"
              >
                Redigera
              </button>
              <button 
                onClick={handleDelete}
                className="button danger"
              >
                Ta bort
              </button>
            </>
          ) : (
            <button 
              onClick={() => setEditing(false)}
              className="button secondary"
            >
              Avbryt
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleUpdate} className="form">
          <div className="form-group">
            <label htmlFor="name">Kundnamn *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
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
              value={formData.contact}
              onChange={handleChange}
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
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">E-post</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => setEditing(false)}
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
              {loading ? 'Sparar...' : 'Spara ändringar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="customer-info">
          <p><strong>Kontaktperson:</strong> {customer.contact || 'Ej angivet'}</p>
          <p><strong>Telefon:</strong> {customer.phone || 'Ej angivet'}</p>
          <p><strong>E-post:</strong> {customer.email || 'Ej angivet'}</p>
        </div>
      )}

      <div className="addresses-section">
        <div className="section-header">
          <h3>Adresser</h3>
          <Link to={`/customers/${customerId}/addresses/new`} className="button primary">
            Lägg till adress
          </Link>
        </div>
        
        {addresses.length === 0 ? (
          <p>Inga adresser tillagda än. Lägg till en adress för att fortsätta.</p>
        ) : (
          <ul className="addresses-list">
            {addresses.map(address => (
              <li key={address.id} className="address-item">
                <Link to={`/customers/${customerId}/addresses/${address.id}`}>
                  <div className="address-content">
                    <p className="address-street">{address.street}</p>
                    <p className="address-city">{address.postalCode} {address.city}</p>
                  </div>
                  <div className="address-arrow">›</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
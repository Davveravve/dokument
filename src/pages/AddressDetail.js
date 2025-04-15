// src/pages/AddressDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useConfirmation } from '../components/ConfirmationProvider';

const AddressDetail = () => {
  const { customerId, addressId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    street: '',
    postalCode: '',
    city: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hämta adressinformation
        const addressDoc = await getDoc(doc(db, 'addresses', addressId));
        
        if (!addressDoc.exists()) {
          setError('Adressen hittades inte');
          setLoading(false);
          return;
        }
        
        const addressData = {
          id: addressDoc.id,
          ...addressDoc.data()
        };
        
        setAddress(addressData);
        setFormData({
          street: addressData.street || '',
          postalCode: addressData.postalCode || '',
          city: addressData.city || ''
        });
        
        // Hämta kundinformation
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        
        if (customerDoc.exists()) {
          setCustomer({
            id: customerDoc.id,
            ...customerDoc.data()
          });
        }
        
        // Hämta anläggningar för adressen
        const installationsQuery = query(
          collection(db, 'installations'), 
          where('addressId', '==', addressId)
        );
        
        const installationsSnapshot = await getDocs(installationsQuery);
        const installationsList = installationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setInstallations(installationsList);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte hämta information');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, addressId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const addressRef = doc(db, 'addresses', addressId);
      await updateDoc(addressRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });
      
      setAddress(prev => ({
        ...prev,
        ...formData,
        updatedAt: new Date() // Placeholder tills serverTimestamp uppdateras
      }));
      
      setEditing(false);
    } catch (err) {
      console.error('Error updating address:', err);
      setError('Kunde inte uppdatera adress');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort adress',
      message: 'Är du säker på att du vill ta bort denna adress? Detta kommer även ta bort alla anläggningar.',
      onConfirm: async () => {
        setLoading(true);
        
        try {
          // Ta bort adressen
          await deleteDoc(doc(db, 'addresses', addressId));
          
          // Här skulle du idealt ha en Cloud Function som tar bort relaterade anläggningar
          // men för enklare implementationer kan du manuellt ta bort relaterade anläggningar
          for (const installation of installations) {
            await deleteDoc(doc(db, 'installations', installation.id));
            // Ta även bort relaterade besiktningar här om nödvändigt
          }
          
          navigate(`/customers/${customerId}`);
        } catch (err) {
          console.error('Error deleting address:', err);
          setError('Kunde inte ta bort adress');
          setLoading(false);
        }
      }
    });
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!address) return <div>Adressen hittades inte</div>;

  return (
    <div className="address-detail">
      <div className="address-header">
        <h2>{address.street}</h2>
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
            <label htmlFor="street">Gatuadress *</label>
            <input
              type="text"
              id="street"
              name="street"
              value={formData.street}
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
              value={formData.postalCode}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="city">Ort *</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
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
        <div className="address-info">
          <p><strong>Adress:</strong> {address.street}</p>
          <p><strong>Postnummer:</strong> {address.postalCode || 'Ej angivet'}</p>
          <p><strong>Ort:</strong> {address.city}</p>
          <p><strong>Kund:</strong> {customer ? customer.name : 'Okänd'}</p>
        </div>
      )}

      <div className="installations-section">
        <div className="section-header">
          <h3>Anläggningar</h3>
          <Link to={`/customers/${customerId}/addresses/${addressId}/installations/new`} className="button primary">
            Lägg till anläggning
          </Link>
        </div>
        
        {installations.length === 0 ? (
          <p>Inga anläggningar tillagda än. Lägg till en anläggning för att fortsätta.</p>
        ) : (
          <ul className="installations-list">
            {installations.map(installation => (
              <li key={installation.id} className="installation-item">
                <Link to={`/customers/${customerId}/addresses/${addressId}/installations/${installation.id}`}>
                  <div className="installation-content">
                    <p className="installation-name">{installation.name}</p>
                    <p className="installation-status">
                      Status: <span className={`status ${installation.status === 'completed' ? 'completed' : 'pending'}`}>
                        {installation.status === 'completed' ? 'Klarmarkerad' : 'Ej klar'}
                      </span>
                    </p>
                  </div>
                  <div className="installation-arrow">›</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="page-navigation">
        <Link to={`/customers/${customerId}`} className="button secondary">
            Tillbaka till kund
        </Link>
        </div>
    </div>
  );
};

export default AddressDetail;
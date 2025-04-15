// src/pages/InstallationDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useConfirmation } from '../components/ConfirmationProvider';

const InstallationDetail = () => {
  const { customerId, addressId, installationId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [installation, setInstallation] = useState(null);
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hämta anläggningsinformation
        const installationDoc = await getDoc(doc(db, 'installations', installationId));
        
        if (!installationDoc.exists()) {
          setError('Anläggningen hittades inte');
          setLoading(false);
          return;
        }
        
        const installationData = {
          id: installationDoc.id,
          ...installationDoc.data()
        };
        
        setInstallation(installationData);
        
        // Hämta adressinformation
        const addressDoc = await getDoc(doc(db, 'addresses', addressId));
        
        if (addressDoc.exists()) {
          setAddress({
            id: addressDoc.id,
            ...addressDoc.data()
          });
        }
        
        // Hämta kundinformation
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        
        if (customerDoc.exists()) {
          setCustomer({
            id: customerDoc.id,
            ...customerDoc.data()
          });
        }
        
        // Hämta besiktningar för anläggningen
        const inspectionsQuery = query(
          collection(db, 'inspections'),
          where('installationId', '==', installationId)
        );
        
        const inspectionsSnapshot = await getDocs(inspectionsQuery);
        const inspectionsList = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setInspections(inspectionsList);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte hämta information');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [installationId, addressId, customerId]);

  const toggleStatus = async () => {
    try {
      const newStatus = installation.status === 'completed' ? 'pending' : 'completed';
      
      await updateDoc(doc(db, 'installations', installationId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      setInstallation(prev => ({
        ...prev,
        status: newStatus,
        updatedAt: new Date() // Placeholder tills serverTimestamp uppdateras
      }));
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Kunde inte uppdatera status');
    }
  };

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort anläggning',
      message: 'Är du säker på att du vill ta bort denna anläggning? Detta kommer ta bort alla tillhörande kontroller.',
      onConfirm: async () => {
        setLoading(true);
        
        try {
          // Ta bort anläggningen
          await deleteDoc(doc(db, 'installations', installationId));
          
          // Idealt skulle du också ta bort relaterade besiktningar här eller använda Cloud Functions
          // för att hantera detta automatiskt.
          for (const inspection of inspections) {
            await deleteDoc(doc(db, 'inspections', inspection.id));
          }
          
          navigate(`/customers/${customerId}/addresses/${addressId}`);
        } catch (err) {
          console.error('Error deleting installation:', err);
          setError('Kunde inte ta bort anläggning');
          setLoading(false);
        }
      }
    });
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!installation) return <div>Anläggningen hittades inte</div>;

  return (
    <div className="installation-detail">
      <div className="installation-header">
        <h2>{installation.name}</h2>
        <div className="action-buttons">
          <button 
            onClick={toggleStatus}
            className={`button ${installation.status === 'completed' ? 'secondary' : 'primary'}`}
          >
            {installation.status === 'completed' ? 'Markera som ej klar' : 'Klarmarkera'}
          </button>
          <button 
            onClick={handleDelete}
            className="button danger"
          >
            Ta bort
          </button>
        </div>
      </div>

      <div className="installation-info">
        <p><strong>Beskrivning:</strong> {installation.description || 'Ingen beskrivning'}</p>
        <p>
          <strong>Status:</strong> 
          <span className={`status ${installation.status === 'completed' ? 'completed' : 'pending'}`}>
            {installation.status === 'completed' ? 'Klarmarkerad' : 'Ej klar'}
          </span>
        </p>
        <p><strong>Adress:</strong> {address ? `${address.street}, ${address.postalCode} ${address.city}` : 'Okänd'}</p>
        <p><strong>Kund:</strong> {customer ? customer.name : 'Okänd'}</p>
      </div>

      <div className="inspections-section">
        <div className="section-header">
          <h3>Kontroller</h3>
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/new`}
            className="button primary"
          >
            Skapa ny kontroll
          </Link>
        </div>
        
        {inspections.length === 0 ? (
          <p>Inga kontroller har gjorts än. Skapa en ny kontroll för att komma igång.</p>
        ) : (
          <ul className="inspections-list">
            {inspections.map(inspection => (
              <li key={inspection.id} className="inspection-item">
                <Link to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/${inspection.id}`}>
                  <div className="inspection-content">
                    <p className="inspection-date">
                      {inspection.createdAt ? new Date(inspection.createdAt.seconds * 1000).toLocaleDateString() : 'Okänt datum'}
                    </p>
                    <p className="inspection-status">
                      <span className={`status ${inspection.status === 'completed' ? 'completed' : 'pending'}`}>
                        {inspection.status === 'completed' ? 'Slutförd' : 'Pågående'}
                      </span>
                    </p>
                  </div>
                  <div className="inspection-arrow">›</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="navigation">
        <Link to={`/customers/${customerId}/addresses/${addressId}`} className="button secondary">
          Tillbaka till adress
        </Link>
      </div>
    </div>
  );
};

export default InstallationDetail;
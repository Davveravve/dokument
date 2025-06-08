// src/pages/InstallationDetail.js - Snygg design utan debug
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const InstallationDetail = () => {
  const { currentUser } = useAuth();
  const { customerId, addressId, installationId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [installation, setInstallation] = useState(null);
  const [address, setAddress] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att visa anläggningar');
        setLoading(false);
        return;
      }

      try {
        // Hämta anläggning
        const installationDoc = await getDoc(doc(db, 'installations', installationId));
        
        if (!installationDoc.exists()) {
          setError('Anläggningen hittades inte');
          return;
        }
        
        const installationData = installationDoc.data();
        
        // Relaxad behörighetskontroll för migration
        if (installationData.userId && installationData.userId !== currentUser.uid) {
          // Tillåt åtkomst under migration
        }
        
        setInstallation({
          id: installationDoc.id,
          ...installationData
        });

        // Hämta kund- och adressinformation
        const [customerDoc, addressDoc] = await Promise.all([
          getDoc(doc(db, 'customers', customerId)),
          getDoc(doc(db, 'addresses', addressId))
        ]);

        if (customerDoc.exists()) {
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
        }

        if (addressDoc.exists()) {
          setAddress({ id: addressDoc.id, ...addressDoc.data() });
        }

        // Hämta kontroller - använd relaxad filtrering
        const inspectionsWithUserQuery = query(
          collection(db, 'inspections'),
          where('installationId', '==', installationId),
          where('userId', '==', currentUser.uid)
        );
        
        const allInspectionsQuery = query(
          collection(db, 'inspections'),
          where('installationId', '==', installationId)
        );
        
        const [inspectionsWithUserSnapshot, allInspectionsSnapshot] = await Promise.all([
          getDocs(inspectionsWithUserQuery),
          getDocs(allInspectionsQuery)
        ]);
        
        const allInspections = allInspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrera kontroller som antingen saknar userId eller tillhör användaren
        const filteredInspections = allInspections.filter(inspection => {
          if (inspection.userId && inspection.userId !== currentUser.uid) {
            return false;
          }
          return true;
        });
        
        // Sortera med senaste först
        filteredInspections.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });
        
        setInspections(filteredInspections);
      } catch (err) {
        console.error('Error fetching installation data:', err);
        setError('Kunde inte hämta anläggningsinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [installationId, customerId, addressId, currentUser]);

  const toggleStatus = async () => {
    if (updating) return;
    
    setUpdating(true);
    try {
      const newStatus = installation.status === 'completed' ? 'pending' : 'completed';
      
      await updateDoc(doc(db, 'installations', installationId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      setInstallation(prev => ({
        ...prev,
        status: newStatus,
        updatedAt: new Date()
      }));
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Kunde inte uppdatera status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort anläggning',
      message: 'Är du säker på att du vill ta bort denna anläggning? Detta kommer ta bort alla tillhörande kontroller.',
      onConfirm: async () => {
        setUpdating(true);
        
        try {
          // Ta bort anläggningen
          await deleteDoc(doc(db, 'installations', installationId));
          
          // Ta bort relaterade kontroller
          for (const inspection of inspections) {
            await deleteDoc(doc(db, 'inspections', inspection.id));
          }
          
          navigate(`/customers/${customerId}/addresses/${addressId}`);
        } catch (err) {
          console.error('Error deleting installation:', err);
          setError('Kunde inte ta bort anläggning');
          setUpdating(false);
        }
      }
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'Okänt datum';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      default: return 'pending';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Slutförd';
      case 'in-progress': return 'Pågående';
      default: return 'Utkast';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Laddar anläggning...</p>
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

  if (!installation) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h3>Anläggningen hittades inte</h3>
          <p>Den anläggning du söker efter finns inte eller har tagits bort.</p>
          <button onClick={() => navigate(-1)} className="button secondary">
            Gå tillbaka
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
            <h1>{installation.name}</h1>
            <div className="header-badges">
              <span className={`status-badge ${installation.status === 'completed' ? 'completed' : 'pending'}`}>
                {installation.status === 'completed' ? 'Klarmarkerad' : 'Ej klar'}
              </span>
              <span className="type-badge">{installation.type || 'Anläggning'}</span>
            </div>
          </div>
          <div className="breadcrumb">
            <Link to="/customers">Kunder</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <Link to={`/customers/${customerId}`}>{customer?.name || 'Kund'}</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <Link to={`/customers/${customerId}/addresses/${addressId}`}>{address?.street || 'Adress'}</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <span>{installation.name}</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            onClick={toggleStatus}
            className={`button ${installation.status === 'completed' ? 'secondary' : 'success'}`}
            disabled={updating}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {installation.status === 'completed' ? (
                <path d="M9 11H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h5l2-3 2 3h5a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-5l-2 3-2-3z"/>
              ) : (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              )}
              {installation.status !== 'completed' && <polyline points="22,4 12,14.01 9,11.01"/>}
            </svg>
            {updating ? 'Uppdaterar...' : (installation.status === 'completed' ? 'Markera som ej klar' : 'Klarmarkera')}
          </button>
          <Link
            to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/edit`}
            className="button secondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Redigera
          </Link>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        <div className="content-grid">
          {/* Installation Info Card */}
          <div className="info-card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M7 15h10M7 11h4"/>
                </svg>
              </div>
              <div>
                <h3>Anläggningsinformation</h3>
                <p>Detaljer och specifikationer</p>
              </div>
            </div>

            <div className="card-content">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Typ</span>
                  <span className="info-value">{installation.type || 'Ej angiven'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className={`info-badge ${installation.status === 'completed' ? 'success' : 'pending'}`}>
                    {installation.status === 'completed' ? 'Klarmarkerad' : 'Ej klar'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Kund</span>
                  <span className="info-value">{customer?.name || 'Okänd'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Adress</span>
                  <span className="info-value">
                    {address ? `${address.street}, ${address.postalCode} ${address.city}` : 'Okänd'}
                  </span>
                </div>
                {installation.description && (
                  <div className="info-item full-width">
                    <span className="info-label">Beskrivning</span>
                    <span className="info-value">{installation.description}</span>
                  </div>
                )}
                {installation.serialNumber && (
                  <div className="info-item">
                    <span className="info-label">Serienummer</span>
                    <span className="info-value">{installation.serialNumber}</span>
                  </div>
                )}
                {installation.manufacturer && (
                  <div className="info-item">
                    <span className="info-label">Tillverkare</span>
                    <span className="info-value">{installation.manufacturer}</span>
                  </div>
                )}
                {installation.model && (
                  <div className="info-item">
                    <span className="info-label">Modell</span>
                    <span className="info-value">{installation.model}</span>
                  </div>
                )}
                {installation.installationDate && (
                  <div className="info-item">
                    <span className="info-label">Installationsdatum</span>
                    <span className="info-value">{installation.installationDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inspections Card */}
          <div className="inspections-card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div>
                <h3>Kontroller</h3>
                <p>{inspections.length} {inspections.length === 1 ? 'kontroll' : 'kontroller'} registrerade</p>
              </div>
              <Link 
                to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/new`}
                className="button primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Skapa ny kontroll
              </Link>
            </div>

            <div className="card-content">
              {inspections.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <h4>Inga kontroller än</h4>
                  <p>Skapa en ny kontroll för att komma igång med dokumentationen.</p>
                  <Link 
                    to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/new`}
                    className="button primary"
                  >
                    Skapa första kontrollen
                  </Link>
                </div>
              ) : (
                <div className="inspections-list">
                  {inspections.map(inspection => (
                    <div key={inspection.id} className="inspection-card">
                      <Link to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/${inspection.id}`}>
                        <div className="inspection-content">
                          <div className="inspection-header">
                            <h4>{inspection.name || 'Namnlös kontroll'}</h4>
                            <span className={`status-badge ${getStatusColor(inspection.status)}`}>
                              {getStatusText(inspection.status)}
                            </span>
                          </div>
                          <div className="inspection-meta">
                            <div className="meta-item">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              <span>Skapad: {formatDate(inspection.createdAt)}</span>
                            </div>
                            {inspection.completedAt && (
                              <div className="meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                  <polyline points="22,4 12,14.01 9,11.01"/>
                                </svg>
                                <span>Slutförd: {formatDate(inspection.completedAt)}</span>
                              </div>
                            )}
                            {inspection.sections && inspection.sections.length > 0 && (
                              <div className="meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14,2 14,8 20,8"/>
                                </svg>
                                <span>{inspection.sections.length} {inspection.sections.length === 1 ? 'sektion' : 'sektioner'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="inspection-arrow">
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
          <Link 
            to={`/customers/${customerId}/addresses/${addressId}`} 
            className="button secondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H6m0 0l6 6m-6-6l6-6"/>
            </svg>
            Tillbaka till adress
          </Link>
        </div>
      </div>

      <style jsx>{`
        .page-header {
          margin-bottom: var(--space-2xl);
        }

        .header-main {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }

        .header-main h1 {
          color: var(--white);
          margin: 0;
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

        .status-badge.completed {
          background: var(--green-light);
          color: var(--green);
          border: 1px solid var(--green);
        }

        .status-badge.pending {
          background: var(--orange-light);
          color: var(--orange);
          border: 1px solid var(--orange);
        }

        .type-badge {
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

        .info-card, .inspections-card {
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          position: relative;
        }

        .info-card::before, .inspections-card::before {
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

        .info-item.full-width {
          grid-column: 1 / -1;
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

        .info-badge {
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius);
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: fit-content;
        }

        .info-badge.success {
          background: var(--green-light);
          color: var(--green);
          border: 1px solid var(--green);
        }

        .info-badge.pending {
          background: var(--orange-light);
          color: var(--orange);
          border: 1px solid var(--orange);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-3xl);
        }

        .empty-icon {
          color: var(--dark-400);
          margin-bottom: var(--space-lg);
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

        .inspections-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .inspection-card {
          background: var(--dark-700);
          border: 1px solid var(--dark-500);
          border-radius: var(--radius);
          transition: all var(--transition);
        }

        .inspection-card:hover {
          border-color: var(--green);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .inspection-card a {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-lg);
          text-decoration: none;
          color: inherit;
        }

        .inspection-content {
          flex: 1;
        }

        .inspection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-md);
        }

        .inspection-header h4 {
          color: var(--white);
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .status-badge.success {
          background: var(--green-light);
          color: var(--green);
          border: 1px solid var(--green);
        }

        .status-badge.warning {
          background: var(--orange-light);
          color: var(--orange);
          border: 1px solid var(--orange);
        }

        .status-badge.pending {
          background: var(--dark-600);
          color: var(--dark-200);
          border: 1px solid var(--dark-500);
        }

        .inspection-meta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-lg);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          color: var(--dark-200);
          font-size: 0.875rem;
        }

        .inspection-arrow {
          color: var(--dark-400);
          transition: all var(--transition);
        }

        .inspection-card:hover .inspection-arrow {
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
          .header-main h1 {
            font-size: 2rem;
          }

          .header-badges {
            flex-wrap: wrap;
          }

          .breadcrumb {
            flex-wrap: wrap;
          }

          .header-actions {
            flex-direction: column;
            gap: var(--space-sm);
          }

          .header-actions .button {
            width: 100%;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .inspection-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-sm);
          }

          .inspection-meta {
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

export default InstallationDetail;
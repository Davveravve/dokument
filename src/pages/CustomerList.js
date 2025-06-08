// src/pages/CustomerList.js - Snygg design utan debug
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const CustomerList = () => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Hämta endast kunder som tillhör inloggad användare
        const customersQuery = query(
          collection(db, 'customers'),
          where('userId', '==', currentUser.uid)
        );
        
        const customersSnapshot = await getDocs(customersQuery);
        const customersList = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sortera alfabetiskt
        customersList.sort((a, b) => a.name.localeCompare(b.name));
        
        setCustomers(customersList);
        setFilteredCustomers(customersList);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError("Kunde inte hämta kunder. Försök igen senare.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [currentUser]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.contact && customer.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getCustomerInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCustomerStats = (customer) => {
    // Placeholder för framtida statistik
    return {
      addresses: 0,
      installations: 0,
      inspections: 0
    };
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Laddar kunder...</p>
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
          <button onClick={() => window.location.reload()} className="button primary">
            Försök igen
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
            <h1>Kunder</h1>
            <p className="header-subtitle">
              {customers.length} {customers.length === 1 ? 'kund' : 'kunder'} registrerade
            </p>
          </div>
          <div className="breadcrumb">
            <Link to="/">Dashboard</Link>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <span>Kunder</span>
          </div>
        </div>

        <div className="header-actions">
          <Link to="/customers/new" className="button primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Lägg till kund
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="page-controls">
        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Sök efter kund, kontakt, email eller telefon..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              {searchTerm && (
                <button onClick={clearSearch} className="clear-search-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="search-stats">
            {searchTerm ? (
              <span className="search-results">
                {filteredCustomers.length} av {customers.length} kunder
              </span>
            ) : (
              <span className="total-count">
                Totalt {customers.length} {customers.length === 1 ? 'kund' : 'kunder'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="page-content">
        {filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            {searchTerm ? (
              <>
                <h3>Inga kunder matchade din sökning</h3>
                <p>Försök med andra sökord eller rensa sökningen för att se alla kunder.</p>
                <button onClick={clearSearch} className="button secondary">
                  Rensa sökningen
                </button>
              </>
            ) : (
              <>
                <h3>Inga kunder än</h3>
                <p>Kom igång genom att lägga till din första kund för att kunna skapa adresser och anläggningar.</p>
                <Link to="/customers/new" className="button primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Lägg till första kunden
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="customers-grid">
            {filteredCustomers.map(customer => {
              const stats = getCustomerStats(customer);
              return (
                <div key={customer.id} className="customer-card">
                  <Link to={`/customers/${customer.id}`}>
                    <div className="customer-card-header">
                      <div className="customer-avatar">
                        <span className="avatar-initials">
                          {getCustomerInitials(customer.name)}
                        </span>
                      </div>
                      <div className="customer-status">
                        <div className="status-indicator active">
                          <div className="status-dot"></div>
                        </div>
                      </div>
                    </div>

                    <div className="customer-card-content">
                      <h3 className="customer-name">{customer.name}</h3>
                      
                      <div className="customer-details">
                        {customer.contact && (
                          <div className="detail-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                            <span>{customer.contact}</span>
                          </div>
                        )}
                        
                        {customer.email && (
                          <div className="detail-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            <span>{customer.email}</span>
                          </div>
                        )}
                        
                        {customer.phone && (
                          <div className="detail-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="customer-stats">
                        <div className="stat-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          <span>{stats.addresses} adresser</span>
                        </div>
                        <div className="stat-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="2"/>
                            <path d="M7 15h10M7 11h4"/>
                          </svg>
                          <span>{stats.installations} anläggningar</span>
                        </div>
                        <div className="stat-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                          </svg>
                          <span>{stats.inspections} kontroller</span>
                        </div>
                      </div>
                    </div>

                    <div className="customer-card-footer">
                      <div className="view-details">
                        <span>Visa detaljer</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9,18 15,12 9,6"/>
                        </svg>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .page-header {
          margin-bottom: var(--space-xl);
        }

        .header-main h1 {
          color: var(--white);
          margin: 0 0 var(--space-sm) 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .header-subtitle {
          color: var(--dark-200);
          margin: 0;
          font-size: 1.1rem;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-size: 0.9rem;
          color: var(--dark-300);
          margin-top: var(--space-lg);
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

        .page-controls {
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          padding: var(--space-xl);
          margin-bottom: var(--space-2xl);
          position: relative;
        }

        .page-controls::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--green), transparent);
          border-radius: var(--radius) var(--radius) 0 0;
        }

        .search-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .search-container {
          flex: 1;
        }

        .search-input-wrapper {
          position: relative;
          max-width: 500px;
        }

        .search-icon {
          position: absolute;
          left: var(--space-md);
          top: 50%;
          transform: translateY(-50%);
          color: var(--dark-400);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: var(--space-md) var(--space-md) var(--space-md) 3rem;
          border: 2px solid var(--dark-500);
          border-radius: var(--radius);
          background: var(--dark-700);
          color: var(--white);
          font-size: 1rem;
          transition: all var(--transition);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--green);
          background: var(--dark-600);
          box-shadow: 0 0 0 3px rgba(0, 255, 0, 0.2);
        }

        .search-input::placeholder {
          color: var(--dark-300);
        }

        .clear-search-btn {
          position: absolute;
          right: var(--space-md);
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--dark-400);
          cursor: pointer;
          padding: var(--space-xs);
          border-radius: 50%;
          transition: all var(--transition);
        }

        .clear-search-btn:hover {
          color: var(--red);
          background: var(--dark-600);
        }

        .search-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .search-results, .total-count {
          color: var(--dark-200);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .search-results {
          color: var(--green);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-3xl);
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
        }

        .empty-icon {
          color: var(--dark-400);
          margin-bottom: var(--space-xl);
        }

        .empty-state h3 {
          color: var(--white);
          margin: 0 0 var(--space-md) 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .empty-state p {
          color: var(--dark-200);
          margin: 0 0 var(--space-xl) 0;
          font-size: 1rem;
          line-height: 1.5;
        }

        .customers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: var(--space-xl);
        }

        .customer-card {
          background: var(--dark-800);
          border: var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          transition: all var(--transition);
          position: relative;
        }

        .customer-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--green), transparent);
          opacity: 0;
          transition: opacity var(--transition);
        }

        .customer-card:hover {
          border-color: var(--green);
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
        }

        .customer-card:hover::before {
          opacity: 1;
        }

        .customer-card a {
          display: block;
          text-decoration: none;
          color: inherit;
          padding: var(--space-xl);
          height: 100%;
        }

        .customer-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
        }

        .customer-avatar {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, var(--green), var(--blue));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .avatar-initials {
          color: var(--white);
          font-size: 1.25rem;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .customer-status {
          position: relative;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          position: relative;
        }

        .status-indicator.active .status-dot {
          background: var(--green);
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.4);
          }
          70% {
            box-shadow: 0 0 0 6px rgba(0, 255, 0, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 255, 0, 0);
          }
        }

        .customer-card-content {
          margin-bottom: var(--space-lg);
        }

        .customer-name {
          color: var(--white);
          margin: 0 0 var(--space-lg) 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .customer-details {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--dark-200);
          font-size: 0.9rem;
        }

        .customer-stats {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--dark-600);
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          color: var(--dark-300);
          font-size: 0.8rem;
        }

        .customer-card-footer {
          padding-top: var(--space-md);
          border-top: 1px solid var(--dark-600);
        }

        .view-details {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: var(--green);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .customer-card:hover .view-details {
          transform: translateX(4px);
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

          .header-actions {
            flex-direction: column;
            width: 100%;
          }

          .header-actions .button {
            width: 100%;
          }

          .search-input-wrapper {
            max-width: 100%;
          }

          .customers-grid {
            grid-template-columns: 1fr;
          }

          .customer-stats {
            flex-direction: column;
          }

          .search-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-sm);
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerList;
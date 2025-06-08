// src/pages/Dashboard.js - Med användarspecifik statistik
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser, userProfile } = useAuth();
  const [stats, setStats] = useState({
    customers: 0,
    templates: 0,
    inspections: 0,
    completedInspections: 0
  });
  const [recentInspections, setRecentInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        console.log('📊 Loading dashboard data for user:', currentUser.email);

        // Hämta användarspecifik statistik
        const [customersSnapshot, templatesSnapshot, inspectionsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'customers'), where('userId', '==', currentUser.uid))),
          getDocs(query(collection(db, 'checklistTemplates'), where('userId', '==', currentUser.uid))),
          getDocs(query(collection(db, 'inspections'), where('userId', '==', currentUser.uid)))
        ]);

        const inspections = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const completedInspections = inspections.filter(inspection => 
          inspection.status === 'completed'
        );

        const newStats = {
          customers: customersSnapshot.size,
          templates: templatesSnapshot.size,
          inspections: inspections.length,
          completedInspections: completedInspections.length
        };

        console.log('📈 User stats:', newStats);
        setStats(newStats);

        // Hämta senaste inspektionerna (begränsa till 5)
        const sortedInspections = inspections
          .sort((a, b) => {
            const aDate = a.createdAt?.seconds || 0;
            const bDate = b.createdAt?.seconds || 0;
            return bDate - aDate;
          })
          .slice(0, 5);

        setRecentInspections(sortedInspections);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser]);

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'Okänt datum';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('sv-SE');
  };

  const getUsagePercentage = (used, limit) => {
    return Math.round((used / limit) * 100);
  };

  // Hämta abonnemangsinformation från userProfile eller använd standardvärden
  const subscription = userProfile?.subscription || {
    plan: 'free',
    status: 'active',
    customersLimit: 1,
    templatesLimit: 3,
    storageUsed: 0,
    storageLimit: 1
  };

  if (loading) return <div className="loading-state">Laddar dashboard...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>Dashboard</h2>
          <p className="header-subtitle">
            Välkommen tillbaka, {currentUser?.email}! Här är en översikt av ditt kontrollsystem.
          </p>
        </div>
        
        <div className="quick-actions">
          <Link to="/customers/new" className="button primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Ny kund
          </Link>
          <Link to="/templates/new" className="button secondary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
            Ny mall
          </Link>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Statistik cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon customers">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.customers}</h3>
              <p>Kunder</p>
              <div className="stat-limit">
                {subscription.customersLimit === 'unlimited' 
                  ? 'Obegränsat' 
                  : `${stats.customers} av ${subscription.customersLimit}`
                }
              </div>
              {subscription.customersLimit !== 'unlimited' && (
                <div className="usage-bar">
                  <div 
                    className="usage-fill" 
                    style={{ width: `${getUsagePercentage(stats.customers, subscription.customersLimit)}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon templates">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.templates}</h3>
              <p>Mallar</p>
              <div className="stat-limit">
                {subscription.templatesLimit === 'unlimited' 
                  ? 'Obegränsat' 
                  : `${stats.templates} av ${subscription.templatesLimit}`
                }
              </div>
              {subscription.templatesLimit !== 'unlimited' && (
                <div className="usage-bar">
                  <div 
                    className="usage-fill" 
                    style={{ width: `${getUsagePercentage(stats.templates, subscription.templatesLimit)}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon inspections">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"/>
                <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1h1v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h1z"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{stats.inspections}</h3>
              <p>Kontroller</p>
              <div className="stat-detail">
                {stats.completedInspections} av {stats.inspections} slutförda
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon storage">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>{subscription.storageUsed.toFixed(1)} GB</h3>
              <p>Lagring</p>
              <div className="stat-limit">
                {subscription.storageLimit === 'unlimited' 
                  ? 'Obegränsat' 
                  : `${subscription.storageUsed.toFixed(1)} av ${subscription.storageLimit} GB`
                }
              </div>
              {subscription.storageLimit !== 'unlimited' && (
                <div className="usage-bar">
                  <div 
                    className="usage-fill" 
                    style={{ width: `${getUsagePercentage(subscription.storageUsed, subscription.storageLimit)}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Huvud-innehåll */}
        <div className="dashboard-main">
          {/* Senaste kontroller */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3>Senaste kontroller</h3>
              <Link to="/inspections" className="view-all-link">
                Visa alla
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </Link>
            </div>
            <div className="section-content">
              {recentInspections.length === 0 ? (
                <div className="empty-section">
                  <p>Inga kontroller än</p>
                </div>
              ) : (
                <div className="inspections-list">
                  {recentInspections.map(inspection => (
                    <div key={inspection.id} className="inspection-item">
                      <Link to={`/inspections/${inspection.id}`}>
                        <div className="inspection-content">
                          <div className="inspection-name">
                            {inspection.name || 'Kontroll'}
                          </div>
                          <div className="inspection-date">
                            {formatDate(inspection.createdAt)}
                          </div>
                        </div>
                        <div className="inspection-status">
                          <span className={`status-badge ${inspection.status || 'draft'}`}>
                            {inspection.status === 'completed' ? 'Slutförd' : 
                             inspection.status === 'in-progress' ? 'Pågående' : 'Utkast'}
                          </span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Snabblänkar */}
          <div className="dashboard-section">
            <div className="section-header">
              <h3>Snabblänkar</h3>
            </div>
            <div className="section-content">
              <div className="quick-links">
                <Link to="/customers" className="quick-link-item">
                  <div className="quick-link-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="quick-link-content">
                    <div className="quick-link-title">Kunder</div>
                    <div className="quick-link-subtitle">{stats.customers} registrerade</div>
                  </div>
                </Link>

                <Link to="/templates" className="quick-link-item">
                  <div className="quick-link-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                    </svg>
                  </div>
                  <div className="quick-link-content">
                    <div className="quick-link-title">Mallar</div>
                    <div className="quick-link-subtitle">{stats.templates} tillgängliga</div>
                  </div>
                </Link>

                <Link to="/inspections/new" className="quick-link-item">
                  <div className="quick-link-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                  </div>
                  <div className="quick-link-content">
                    <div className="quick-link-title">Ny kontroll</div>
                    <div className="quick-link-subtitle">Starta direkt</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
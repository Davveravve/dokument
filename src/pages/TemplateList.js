// src/pages/TemplateList.js - Med användarspecifik filtrering
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

const TemplateList = () => {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Hämta endast mallar som tillhör inloggad användare
        const templatesQuery = query(
          collection(db, 'checklistTemplates'),
          where('userId', '==', currentUser.uid)
        );
        
        const templatesSnapshot = await getDocs(templatesQuery);
        const templatesList = templatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`📝 Loaded ${templatesList.length} templates for user ${currentUser.email}`);
        setTemplates(templatesList);
        setFilteredTemplates(templatesList);
      } catch (err) {
        console.error("Error fetching templates:", err);
        setError("Kunde inte hämta mallar. Försök igen senare.");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [currentUser]);

  useEffect(() => {
    const filtered = templates.filter(template =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredTemplates(filtered);
  }, [searchTerm, templates]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getTemplateStats = (template) => {
    const sectionCount = template.sections ? template.sections.length : 0;
    const itemCount = template.sections ? 
      template.sections.reduce((total, section) => total + (section.items ? section.items.length : 0), 0) : 0;
    
    return { sectionCount, itemCount };
  };

  if (loading) return <div className="loading-state">Laddar mallar...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h2>Mallar</h2>
          <p className="header-subtitle">
            Skapa och hantera dina kontrollmallar
          </p>
        </div>
        <div className="header-actions">
          <Link to="/templates/new" className="button primary">
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

      <div className="page-content">
        {/* Sökfält */}
        <div className="search-section">
          <div className="search-input-container">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Sök mallar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button onClick={clearSearch} className="search-clear">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <div className="search-results">
            {searchTerm && (
              <p>{filteredTemplates.length} av {templates.length} mallar</p>
            )}
          </div>
        </div>

        {/* Mallista */}
        {filteredTemplates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
              </svg>
            </div>
            <h3>
              {searchTerm ? 'Inga mallar matchade din sökning' : 'Inga mallar än'}
            </h3>
            <p>
              {searchTerm 
                ? 'Försök med andra sökord eller rensa sökningen' 
                : 'Kom igång genom att skapa din första kontrollmall'
              }
            </p>
            {!searchTerm && (
              <Link to="/templates/new" className="button primary">
                Skapa mall
              </Link>
            )}
          </div>
        ) : (
          <div className="templates-grid">
            {filteredTemplates.map(template => {
              const stats = getTemplateStats(template);
              return (
                <div key={template.id} className="template-card">
                  <Link to={`/templates/${template.id}`}>
                    <div className="template-card-header">
                      <div className="template-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                        </svg>
                      </div>
                      <div className="template-status">
                        <div className="status-dot active"></div>
                      </div>
                    </div>
                    
                    <div className="template-card-content">
                      <h3>{template.name}</h3>
                      {template.description && (
                        <p className="template-description">{template.description}</p>
                      )}
                    </div>
                    
                    <div className="template-card-stats">
                      <div className="stat-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z"/>
                          <path d="M19 11H15a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z"/>
                          <path d="M9 7H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                          <path d="M19 7H15a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                        </svg>
                        <span>{stats.sectionCount} sektioner</span>
                      </div>
                      <div className="stat-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4"/>
                          <path d="M21 12c.552 0 1-.448 1-1V8a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v3c0 .552.448 1 1 1h1v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2h1z"/>
                        </svg>
                        <span>{stats.itemCount} punkter</span>
                      </div>
                    </div>
                    
                    <div className="template-card-footer">
                      <div className="view-template-btn">
                        <span>Visa mall</span>
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
    </div>
  );
};

export default TemplateList;
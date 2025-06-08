// src/pages/TemplateDetail.js - Med användarspecifik behörighetskontroll
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmation } from '../components/ConfirmationProvider';

const TemplateDetail = () => {
  const { currentUser } = useAuth();
  const { templateId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!currentUser) {
        setError('Du måste vara inloggad för att visa mallar');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching template:', templateId, 'for user:', currentUser.email);
        
        const templateDoc = await getDoc(doc(db, 'checklistTemplates', templateId));
        
        if (!templateDoc.exists()) {
          setError('Mallen hittades inte');
          setLoading(false);
          return;
        }
        
        const templateData = templateDoc.data();
        console.log('📋 Template data:', {
          name: templateData.name,
          userId: templateData.userId || 'MISSING',
          userEmail: templateData.userEmail || 'MISSING',
          currentUserId: currentUser.uid
        });

        // Kontrollera att mallen tillhör inloggad användare
        if (templateData.userId !== currentUser.uid) {
          console.log('❌ Access denied: Template belongs to different user');
          setError('Du har inte behörighet att visa denna mall');
          setLoading(false);
          return;
        }
        
        setTemplate({
          id: templateDoc.id,
          ...templateData
        });
        
        console.log('✅ Template loaded successfully');
      } catch (err) {
        console.error('❌ Error fetching template:', err);
        setError('Kunde inte hämta mallinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, currentUser]);

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort mall',
      message: 'Är du säker på att du vill ta bort denna mall? Detta kommer inte påverka redan skapade kontroller som använder mallen.',
      onConfirm: async () => {
        setLoading(true);
        
        try {
          await deleteDoc(doc(db, 'checklistTemplates', templateId));
          console.log('✅ Template deleted');
          navigate('/templates');
        } catch (err) {
          console.error('❌ Error deleting template:', err);
          setError('Kunde inte ta bort mall');
          setLoading(false);
        }
      }
    });
  };

  const getItemTypeLabel = (type) => {
    switch (type) {
      case 'yesno': return 'JA/NEJ';
      case 'checkbox': return 'KRYSSRUTA';
      case 'text': return 'TEXT';
      case 'header': return 'RUBRIK';
      default: return type.toUpperCase();
    }
  };

  const renderPreviewItem = (item) => {
    switch (item.type) {
      case 'header':
        return (
          <div className="preview-header">
            <h4>{item.label}</h4>
          </div>
        );
      
      case 'yesno':
        return (
          <div className="preview-yesno">
            <div className="preview-question">
              <span className="preview-label">{item.label}</span>
              {item.allowImages && <span className="image-indicator">📷</span>}
            </div>
            <div className="preview-radio-options">
              {item.options?.map(option => (
                <label key={option} className="preview-radio-label">
                  <input type="radio" name={`preview-${item.id}`} disabled />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="preview-checkbox">
            <label className="preview-checkbox-label">
              <input type="checkbox" disabled />
              <span>{item.label}</span>
              {item.allowImages && <span className="image-indicator">📷</span>}
            </label>
          </div>
        );
      
      case 'text':
        return (
          <div className="preview-text">
            <div className="preview-question">
              <span className="preview-label">{item.label}</span>
              {item.allowImages && <span className="image-indicator">📷</span>}
            </div>
            <div className="preview-text-input">
              <input 
                type="text" 
                placeholder="Textinmatning..." 
                disabled 
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="preview-unknown">
            <span>Okänd typ: {item.type}</span>
          </div>
        );
    }
  };

  if (loading) return <div className="loading-state">Laddar mall...</div>;

  if (error) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h3>Ett fel uppstod</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={() => navigate('/templates')} className="button secondary">
              Tillbaka till mallar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return <div className="error-state">Mallen hittades inte</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h2>{template.name}</h2>
          <p className="header-subtitle">
            {template.description || 'Kontrollmall förhandsvisning'}
          </p>
        </div>
        <div className="header-actions">
          <Link 
            to={`/templates/${templateId}/edit`} 
            className="button secondary"
            onClick={() => console.log('🔧 Navigating to edit:', `/templates/${templateId}/edit`)}
          >
            Redigera
          </Link>
          <button 
            onClick={handleDelete} 
            className="button danger"
          >
            Ta bort
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="template-preview">
          {/* Template metadata */}
          <div className="template-meta">
            <div className="meta-section">
              <h3>Mallinformation</h3>
              <div className="meta-grid">
                <div className="meta-item">
                  <label>Namn</label>
                  <span>{template.name}</span>
                </div>
                {template.description && (
                  <div className="meta-item">
                    <label>Beskrivning</label>
                    <span>{template.description}</span>
                  </div>
                )}
                <div className="meta-item">
                  <label>Skapare</label>
                  <span>{template.userEmail || 'Okänd'}</span>
                </div>
                <div className="meta-item">
                  <label>Sektioner</label>
                  <span>{template.sections?.length || 0}</span>
                </div>
                <div className="meta-item">
                  <label>Totalt antal punkter</label>
                  <span>
                    {template.sections?.reduce((total, section) => 
                      total + (section.items?.length || 0), 0
                    ) || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Template sections preview */}
          <div className="preview-sections">
            <h3>Förhandsvisning</h3>
            
            {!template.sections || template.sections.length === 0 ? (
              <div className="empty-template">
                <p>Denna mall har inga sektioner än.</p>
                <Link to={`/templates/${templateId}/edit`} className="button primary">
                  Lägg till sektioner
                </Link>
              </div>
            ) : (
              template.sections.map((section, sectionIndex) => (
                <div key={section.id || sectionIndex} className="preview-section">
                  <div className="preview-section-header">
                    <h4>{section.title || `Sektion ${sectionIndex + 1}`}</h4>
                    <span className="section-item-count">
                      {section.items?.length || 0} punkter
                    </span>
                  </div>
                  
                  <div className="preview-items">
                    {!section.items || section.items.length === 0 ? (
                      <div className="empty-section">
                        <p>Inga punkter i denna sektion</p>
                      </div>
                    ) : (
                      section.items.map((item, itemIndex) => (
                        <div key={item.id || itemIndex} className="preview-item-card">
                          <div className="preview-item-header">
                            <span className="item-type-badge">
                              {getItemTypeLabel(item.type)}
                            </span>
                            {item.required && (
                              <span className="required-badge">Obligatorisk</span>
                            )}
                          </div>
                          <div className="preview-item-content">
                            {renderPreviewItem(item)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Template actions */}
          <div className="template-actions">
            <Link to="/templates" className="button secondary">
              Tillbaka till mallar
            </Link>
            <Link to={`/templates/${templateId}/edit`} className="button primary">
              Redigera mall
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetail;
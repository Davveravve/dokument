// src/pages/TemplateBuilder.js - Med användarspecifik mallskapande
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

const TemplateBuilder = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isEdit = Boolean(templateId);
  
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    sections: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    if (isEdit && templateId) {
      const fetchTemplate = async () => {
        try {
          const templateDoc = await getDoc(doc(db, 'checklistTemplates', templateId));
          if (templateDoc.exists()) {
            const data = templateDoc.data();
            // Kontrollera att mallen tillhör inloggad användare
            if (data.userId !== currentUser.uid) {
              setError('Du har inte behörighet att redigera denna mall');
              return;
            }
            setTemplateData({
              name: data.name || '',
              description: data.description || '',
              sections: data.sections || []
            });
          } else {
            setError('Mallen hittades inte');
          }
        } catch (err) {
          console.error('Error fetching template:', err);
          setError('Kunde inte hämta mallinformation');
        }
      };
      
      fetchTemplate();
    }
  }, [isEdit, templateId, currentUser.uid]);

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addSection = () => {
    const newSection = {
      id: uuidv4(),
      title: 'Ny sektion',
      items: []
    };
    
    setTemplateData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (sectionId, updates) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  const deleteSection = (sectionId) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const addItem = (sectionId, type = 'yesno') => {
    const newItem = {
      id: uuidv4(),
      type,
      label: type === 'header' ? 'Rubrik' : 'Ny fråga',
      required: true,
      allowImages: false
    };

    if (type === 'yesno') {
      newItem.options = ['Ja', 'Nej'];
    }

    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: [...section.items, newItem] }
          : section
      )
    }));
  };

  const updateItem = (sectionId, itemId, updates) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              )
            }
          : section
      )
    }));
  };

  const deleteItem = (sectionId, itemId) => {
    setTemplateData(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, items: section.items.filter(item => item.id !== itemId) }
          : section
      )
    }));
  };

  const moveItem = (fromSectionId, toSectionId, itemId, newIndex) => {
    setTemplateData(prev => {
      const newSections = [...prev.sections];
      
      // Hitta item som ska flyttas
      const fromSection = newSections.find(s => s.id === fromSectionId);
      const itemToMove = fromSection.items.find(i => i.id === itemId);
      
      // Ta bort från ursprunglig sektion
      fromSection.items = fromSection.items.filter(i => i.id !== itemId);
      
      // Lägg till i ny sektion
      const toSection = newSections.find(s => s.id === toSectionId);
      toSection.items.splice(newIndex, 0, itemToMove);
      
      return { ...prev, sections: newSections };
    });
  };

  const handleSave = async () => {
    if (!currentUser) {
      setError('Du måste vara inloggad för att skapa mallar');
      return;
    }

    if (!templateData.name.trim()) {
      setError('Mallnamn är obligatoriskt');
      return;
    }

    if (templateData.sections.length === 0) {
      setError('Mallen måste ha minst en sektion');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const templateToSave = {
        ...templateData,
        userId: currentUser.uid,           // 👈 Koppla till användare
        userEmail: currentUser.email,     // 👈 Spara email också
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        // Uppdatera befintlig mall
        await updateDoc(doc(db, 'checklistTemplates', templateId), templateToSave);
        console.log('✅ Template updated for user:', currentUser.email);
      } else {
        // Skapa ny mall
        templateToSave.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'checklistTemplates'), templateToSave);
        console.log('✅ New template created for user:', currentUser.email, 'ID:', docRef.id);
      }

      console.log('🚀 Navigating to /templates...');
      navigate('/templates');
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Kunde inte spara mall. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = (sectionId, item, index) => {
    return (
      <div
        key={item.id}
        className="template-item"
        draggable
        onDragStart={(e) => {
          setDraggedItem({ sectionId, itemId: item.id, index });
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedItem && draggedItem.itemId !== item.id) {
            moveItem(draggedItem.sectionId, sectionId, draggedItem.itemId, index);
          }
          setDraggedItem(null);
        }}
      >
        <div className="item-header">
          <div className="item-type-badge">
            {item.type === 'yesno' && 'JA/NEJ'}
            {item.type === 'checkbox' && 'KRYSSRUTA'}
            {item.type === 'text' && 'TEXT'}
            {item.type === 'header' && 'RUBRIK'}
          </div>
          <button
            onClick={() => deleteItem(sectionId, item.id)}
            className="delete-item-btn"
            title="Ta bort"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
            </svg>
          </button>
        </div>

        <div className="item-content">
          <div className="form-group">
            <label>Fråga/Rubrik</label>
            <input
              type="text"
              value={item.label}
              onChange={(e) => updateItem(sectionId, item.id, { label: e.target.value })}
              placeholder={item.type === 'header' ? 'Rubriktext' : 'Skriv din fråga här'}
            />
          </div>

          {item.type !== 'header' && (
            <div className="item-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={item.required || false}
                  onChange={(e) => updateItem(sectionId, item.id, { required: e.target.checked })}
                />
                <span>Obligatorisk</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={item.allowImages || false}
                  onChange={(e) => updateItem(sectionId, item.id, { allowImages: e.target.checked })}
                />
                <span>Tillåt bilder</span>
              </label>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentUser) {
    return <div className="error-state">Du måste vara inloggad för att skapa mallar</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h2>{isEdit ? 'Redigera mall' : 'Skapa ny mall'}</h2>
          <p className="header-subtitle">
            {isEdit ? 'Uppdatera din kontrollmall' : 'Bygg en anpassad kontrollmall'}
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => navigate('/templates')}
            className="button secondary"
            disabled={loading}
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            className="button primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                {isEdit ? 'Uppdaterar...' : 'Sparar...'}
              </>
            ) : (
              <>
                {isEdit ? 'Uppdatera mall' : 'Spara mall'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        <div className="template-builder">
          {/* Grundläggande information */}
          <div className="builder-section">
            <h3>Grundläggande information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Mallnamn *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={templateData.name}
                  onChange={handleBasicInfoChange}
                  placeholder="T.ex. Årlig elsäkerhetskontroll"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  name="description"
                  value={templateData.description}
                  onChange={handleBasicInfoChange}
                  placeholder="Kort beskrivning av vad mallen används till"
                  rows="3"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Sektioner */}
          <div className="builder-section">
            <div className="section-header">
              <h3>Kontrollpunkter</h3>
              <button
                onClick={addSection}
                className="button secondary"
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Lägg till sektion
              </button>
            </div>

            {templateData.sections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M9 11H5a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z"/>
                    <path d="M19 11H15a2 2 0 0 0-2 2v3c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z"/>
                  </svg>
                </div>
                <h4>Inga sektioner än</h4>
                <p>Börja med att lägga till din första sektion</p>
                <button
                  onClick={addSection}
                  className="button primary"
                  disabled={loading}
                >
                  Lägg till sektion
                </button>
              </div>
            ) : (
              <div className="sections-list">
                {templateData.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="template-section">
                    <div className="section-header">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="section-title-input"
                        placeholder="Sektionsnamn"
                        disabled={loading}
                      />
                      <div className="section-actions">
                        <div className="dropdown">
                          <button className="dropdown-trigger">
                            Lägg till
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="6,9 12,15 18,9"/>
                            </svg>
                          </button>
                          <div className="dropdown-menu">
                            <button onClick={() => addItem(section.id, 'yesno')}>
                              JA/NEJ fråga
                            </button>
                            <button onClick={() => addItem(section.id, 'checkbox')}>
                              Kryssruta
                            </button>
                            <button onClick={() => addItem(section.id, 'text')}>
                              Textfält
                            </button>
                            <button onClick={() => addItem(section.id, 'header')}>
                              Rubrik
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSection(section.id)}
                          className="delete-section-btn"
                          title="Ta bort sektion"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="section-items">
                      {section.items.length === 0 ? (
                        <div className="empty-section">
                          <p>Inga kontrollpunkter i denna sektion</p>
                          <button
                            onClick={() => addItem(section.id, 'yesno')}
                            className="button secondary small"
                          >
                            Lägg till första punkten
                          </button>
                        </div>
                      ) : (
                        section.items.map((item, itemIndex) => 
                          renderItem(section.id, item, itemIndex)
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateBuilder;
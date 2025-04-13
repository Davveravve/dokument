// src/pages/TemplateBuilder.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { v4 as uuidv4 } from 'uuid';

const TemplateBuilder = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    sections: [{ 
      title: 'Sektion 1', 
      items: [] 
    }]
  });

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) {
        setLoading(false);
        return;
      }

      try {
        const templateDoc = await getDoc(doc(db, 'checklistTemplates', templateId));
        if (templateDoc.exists()) {
          setTemplate(templateDoc.data());
        } else {
          navigate('/templates/new');
        }
      } catch (error) {
        console.error("Error fetching template:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, navigate]);

  const handleTemplateChange = (e) => {
    const { name, value } = e.target;
    setTemplate(prev => ({ ...prev, [name]: value }));
  };

  const handleSectionChange = (index, newTitle) => {
    const updatedSections = [...template.sections];
    updatedSections[index].title = newTitle;
    setTemplate(prev => ({ ...prev, sections: updatedSections }));
  };

  const addSection = () => {
    const newSection = {
      title: `Sektion ${template.sections.length + 1}`,
      items: []
    };
    setTemplate(prev => ({ 
      ...prev, 
      sections: [...prev.sections, newSection] 
    }));
  };

  const removeSection = (index) => {
    if (template.sections.length === 1) {
      alert('Du måste ha minst en sektion');
      return;
    }
    
    const updatedSections = template.sections.filter((_, i) => i !== index);
    setTemplate(prev => ({ ...prev, sections: updatedSections }));
  };

  const addItem = (sectionIndex, type) => {
    const newItem = {
      id: uuidv4(),
      type: type,
      label: type === 'yesno' ? 'Ny ja/nej-fråga' : 
             type === 'checkbox' ? 'Ny kryssruta' : 'Nytt textfält',
      required: false,
      allowImages: type !== 'header',
      allowMultiple: type === 'checkbox',
      // För ja/nej frågor, 'value' kan vara "yes", "no", eller null/undefined (ej besvarad)
      value: type === 'yesno' ? null : '',
    };

    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].items.push(newItem);
    setTemplate(prev => ({ ...prev, sections: updatedSections }));
  };

  const removeItem = (sectionIndex, itemIndex) => {
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].items.splice(itemIndex, 1);
    setTemplate(prev => ({ ...prev, sections: updatedSections }));
  };

  const updateItem = (sectionIndex, itemIndex, field, value) => {
    const updatedSections = [...template.sections];
    updatedSections[sectionIndex].items[itemIndex][field] = value;
    setTemplate(prev => ({ ...prev, sections: updatedSections }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!template.name.trim()) {
      alert('Mallnamn måste anges');
      return;
    }
    
    setSaving(true);
    
    try {
      if (templateId) {
        // Uppdatera befintlig mall
        await setDoc(doc(db, 'checklistTemplates', templateId), {
          ...template,
          updatedAt: serverTimestamp()
        });
      } else {
        // Skapa ny mall
        await addDoc(collection(db, 'checklistTemplates'), {
          ...template,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      navigate('/templates');
    } catch (error) {
      console.error("Error saving template:", error);
      alert('Kunde inte spara mallen. Försök igen senare.');
      setSaving(false);
    }
  };

  if (loading) return <div>Laddar...</div>;

  return (
    <div className="template-builder">
      <h2>{templateId ? 'Redigera mall' : 'Skapa ny mall'}</h2>
      
      <form onSubmit={handleSubmit} className="template-form">
        <div className="form-group">
          <label htmlFor="name">Mallnamn *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={template.name}
            onChange={handleTemplateChange}
            required
            placeholder="T.ex. Elkontroll, Standardchecklista"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Beskrivning</label>
          <textarea
            id="description"
            name="description"
            value={template.description}
            onChange={handleTemplateChange}
            rows="2"
            placeholder="Valfri beskrivning av mallen"
          />
        </div>
        
        <div className="template-sections">
          <h3>Sektioner</h3>
          
          {template.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="template-section">
              <div className="section-header">
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleSectionChange(sectionIndex, e.target.value)}
                  placeholder="Sektionsnamn"
                />
                <button 
                  type="button" 
                  onClick={() => removeSection(sectionIndex)}
                  className="button danger small"
                >
                  Ta bort
                </button>
              </div>
              
              <div className="section-items">
                {section.items.map((item, itemIndex) => (
                  <div key={item.id} className="section-item">
                    <div className="item-type">
                      {item.type === 'yesno' ? 'Ja/Nej-fråga' : 
                       item.type === 'checkbox' ? 'Kryssruta' : 
                       item.type === 'text' ? 'Textfält' : 'Rubrik'}
                    </div>
                    <div className="item-inputs">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => updateItem(sectionIndex, itemIndex, 'label', e.target.value)}
                        placeholder="Etikett"
                      />
                      
                      {item.type !== 'header' && (
                        <div className="item-options">
                          <label>
                            <input
                              type="checkbox"
                              checked={item.required}
                              onChange={(e) => updateItem(sectionIndex, itemIndex, 'required', e.target.checked)}
                            />
                            Obligatorisk
                          </label>
                          
                          <label>
                            <input
                              type="checkbox"
                              checked={item.allowImages}
                              onChange={(e) => updateItem(sectionIndex, itemIndex, 'allowImages', e.target.checked)}
                            />
                            Tillåt bilder
                          </label>
                          
                          {item.type === 'checkbox' && (
                            <label>
                              <input
                                type="checkbox"
                                checked={item.allowMultiple}
                                onChange={(e) => updateItem(sectionIndex, itemIndex, 'allowMultiple', e.target.checked)}
                              />
                              Tillåt flera
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeItem(sectionIndex, itemIndex)}
                      className="button danger small"
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
                
                <div className="item-actions">
                  <button 
                    type="button" 
                    onClick={() => addItem(sectionIndex, 'yesno')}
                    className="button secondary small"
                  >
                    + Ja/Nej-fråga
                  </button>
                  <button 
                    type="button" 
                    onClick={() => addItem(sectionIndex, 'checkbox')}
                    className="button secondary small"
                  >
                    + Kryssruta
                  </button>
                  <button 
                    type="button" 
                    onClick={() => addItem(sectionIndex, 'text')}
                    className="button secondary small"
                  >
                    + Textfält
                  </button>
                  <button 
                    type="button" 
                    onClick={() => addItem(sectionIndex, 'header')}
                    className="button secondary small"
                  >
                    + Rubrik
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          <button 
            type="button" 
            onClick={addSection}
            className="button secondary"
          >
            + Lägg till sektion
          </button>
        </div>
        
        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate('/templates')}
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
            {saving ? 'Sparar...' : templateId ? 'Spara ändringar' : 'Spara mall'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TemplateBuilder;
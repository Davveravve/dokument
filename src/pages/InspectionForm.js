// src/pages/InspectionForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { v4 as uuidv4 } from 'uuid';
import ImageUploader from '../components/ImageUploader';

const InspectionForm = () => {
  const { customerId, addressId, installationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [inspection, setInspection] = useState(null);
  const [installation, setInstallation] = useState(null);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemType, setNewItemType] = useState('yesno');
  const [activeSectionForNewItem, setActiveSectionForNewItem] = useState(null);
  const [savingAsNewTemplate, setSavingAsNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hämta anläggningsinformation
        const installationDoc = await getDoc(doc(db, 'installations', installationId));
        
        if (!installationDoc.exists()) {
          setError('Anläggningen hittades inte');
          return;
        }
        
        setInstallation({
          id: installationDoc.id,
          ...installationDoc.data()
        });
        
        // Hämta tillgängliga mallar
        const templatesCollection = collection(db, 'checklistTemplates');
        const templatesSnapshot = await getDocs(templatesCollection);
        const templatesList = templatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTemplates(templatesList);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte hämta nödvändig information');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [installationId]);

  const handleTemplateSelect = async (e) => {
    const templateId = e.target.value;
    setSelectedTemplateId(templateId);
    
    if (!templateId) {
      setInspection(null);
      return;
    }
    
    try {
      const templateDoc = await getDoc(doc(db, 'checklistTemplates', templateId));
      
      if (!templateDoc.exists()) {
        setError('Mallen hittades inte');
        return;
      }
      
      const templateData = templateDoc.data();
      
      // Skapa en ny besiktning baserad på mallen
      const newInspection = {
        templateId,
        installationId,
        addressId,
        customerId,
        status: 'draft',
        sections: templateData.sections.map(section => ({
          title: section.title,
          items: section.items.map(item => ({
            id: uuidv4(),
            parentId: item.id, // Referens till mallens originalpost
            type: item.type,
            label: item.label,
            required: item.required,
            allowImages: item.allowImages,
            allowMultiple: item.allowMultiple,
            value: item.type === 'yesno' ? null : 
                  item.type === 'checkbox' ? false : '',
            notes: '',
            images: []
          }))
        }))
      };
      
      setInspection(newInspection);
    } catch (err) {
      console.error('Error loading template:', err);
      setError('Kunde inte ladda mallen');
    }
  };

  const handleItemChange = (sectionIndex, itemIndex, field, value) => {
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items[itemIndex][field] = value;
    setInspection(updatedInspection);
  };

  const handleImageUpload = (sectionIndex, itemIndex, imageData) => {
    const updatedInspection = { ...inspection };
    const item = updatedInspection.sections[sectionIndex].items[itemIndex];
    
    // Initialisera images-array om den inte finns
    if (!Array.isArray(item.images)) {
      item.images = [];
    }
    
    // Lägg till den nya bilden
    item.images.push(imageData);
    
    setInspection(updatedInspection);
  };

  const handleDeleteImage = (sectionIndex, itemIndex, imageIndex) => {
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items[itemIndex].images.splice(imageIndex, 1);
    
    setInspection(updatedInspection);
  };

  const addNewItem = (sectionIndex) => {
    if (!newItemLabel.trim()) {
      alert('Ange en etikett för den nya frågan');
      return;
    }

    const updatedInspection = { ...inspection };
    const newItem = {
      id: uuidv4(),
      type: newItemType,
      label: newItemLabel,
      required: false,
      allowImages: true,
      allowMultiple: newItemType === 'checkbox',
      value: newItemType === 'yesno' ? null : 
            newItemType === 'checkbox' ? false : '',
      notes: '',
      images: []
    };
    
    updatedInspection.sections[sectionIndex].items.push(newItem);
    setInspection(updatedInspection);
    
    // Återställ formuläret
    setNewItemLabel('');
    setNewItemType('yesno');
    setActiveSectionForNewItem(null);
  };

  const removeItem = (sectionIndex, itemIndex) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna fråga?')) {
      return;
    }
    
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items.splice(itemIndex, 1);
    setInspection(updatedInspection);
  };

  const handleEditItem = (sectionIndex, itemIndex, newLabel) => {
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items[itemIndex].label = newLabel;
    setInspection(updatedInspection);
  };

  const toggleEditingQuestions = () => {
    setEditingQuestions(!editingQuestions);
  };

  const saveAsNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Ange ett namn för den nya mallen');
      return;
    }
    
    setSaving(true);
    
    try {
      // Skapa en ny mall baserad på nuvarande besiktning
      const templateData = {
        name: newTemplateName,
        description: `Skapad från kontroller för ${installation?.name || 'anläggning'}`,
        sections: inspection.sections.map(section => ({
          title: section.title,
          items: section.items.map(item => ({
            id: uuidv4(),
            type: item.type,
            label: item.label,
            required: item.required,
            allowImages: item.allowImages,
            allowMultiple: item.allowMultiple
          }))
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'checklistTemplates'), templateData);
      
      setSavingAsNewTemplate(false);
      setNewTemplateName('');
      alert('Mallen har sparats!');
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Kunde inte spara mallen. Försök igen senare.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inspection) {
      alert('Välj en mall för att fortsätta');
      return;
    }
    
    setSaving(true);
    
    try {
      // Lägg till ny besiktning i Firestore
      const docRef = await addDoc(collection(db, 'inspections'), {
        ...inspection,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      navigate(`/customers/${customerId}/addresses/${addressId}/installations/${installationId}/inspections/${docRef.id}`);
    } catch (err) {
      console.error('Error saving inspection:', err);
      setError('Kunde inte spara kontrollen');
      setSaving(false);
    }
  };

  // Komponent för att visa miniatyrgalleri
  const ImageGallery = ({ images, onDelete }) => {
    if (!Array.isArray(images) || images.length === 0) return null;
    
    return (
      <div className="image-gallery">
        {images.map((image, index) => (
          <div key={index} className="thumbnail-container">
            <img 
              src={image.url} 
              alt={`Bild ${index + 1}`} 
              className="image-thumbnail" 
            />
            {onDelete && (
              <button 
                className="thumbnail-delete" 
                onClick={() => onDelete(index)}
                title="Ta bort bild"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!installation) return <div>Anläggningen hittades inte</div>;

  return (
    <div className="inspection-form">
      <h2>Ny kontroll</h2>
      <p>Anläggning: {installation.name}</p>
      
      <div className="template-selection">
        <label htmlFor="template">Välj mall:</label>
        <select 
          id="template" 
          value={selectedTemplateId} 
          onChange={handleTemplateSelect}
          className="template-select"
        >
          <option value="">-- Välj en mall --</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
      
      {inspection ? (
        <form onSubmit={handleSubmit} className="inspection-checklist">
          <div className="form-actions-top">
            <button
              type="button"
              onClick={toggleEditingQuestions}
              className="button secondary"
            >
              {editingQuestions ? 'Avsluta redigering' : 'Redigera frågor'}
            </button>

            <button
              type="button"
              onClick={() => setSavingAsNewTemplate(true)}
              className="button secondary"
            >
              Spara som ny mall
            </button>
          </div>

          {savingAsNewTemplate && (
            <div className="save-template-modal">
              <div className="save-template-form">
                <h3>Spara som ny mall</h3>
                <div className="form-group">
                  <label htmlFor="newTemplateName">Mallnamn:</label>
                  <input
                    type="text"
                    id="newTemplateName"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setSavingAsNewTemplate(false)}
                    className="button secondary"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={saveAsNewTemplate}
                    className="button primary"
                    disabled={saving}
                  >
                    {saving ? 'Sparar...' : 'Spara mall'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {inspection.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="inspection-section">
              <h3>{section.title}</h3>
              
              <div className="section-items">
                {section.items.map((item, itemIndex) => (
                  <div key={item.id} className="checklist-item">
                    {item.type === 'header' ? (
                      <div className="header-item">
                        {editingQuestions ? (
                          <div className="edit-header">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleEditItem(sectionIndex, itemIndex, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(sectionIndex, itemIndex)}
                              className="button danger small"
                            >
                              Ta bort
                            </button>
                          </div>
                        ) : (
                          <h4>{item.label}</h4>
                        )}
                      </div>
                    ) : item.type === 'yesno' ? (
                      <div className="yesno-item">
                        {editingQuestions ? (
                          <div className="edit-label">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleEditItem(sectionIndex, itemIndex, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(sectionIndex, itemIndex)}
                              className="button danger small"
                            >
                              Ta bort
                            </button>
                          </div>
                        ) : (
                          <label className="item-label">
                            {item.label}
                            {item.required && <span className="required">*</span>}
                          </label>
                        )}
                        
                        <div className="radio-options">
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`yesno-${item.id}`}
                              checked={item.value === "yes"}
                              onChange={() => handleItemChange(sectionIndex, itemIndex, 'value', "yes")}
                            />
                            Ja
                          </label>
                          <label className="radio-label">
                            <input
                              type="radio"
                              name={`yesno-${item.id}`}
                              checked={item.value === "no"}
                              onChange={() => handleItemChange(sectionIndex, itemIndex, 'value', "no")}
                            />
                            Nej
                          </label>
                        </div>
                        
                        {/* Anteckningsfält */}
                        <textarea
                          placeholder="Anteckningar"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'notes', e.target.value)}
                          rows="2"
                        />
                        
                        {/* Bilduppladdning */}
                        {item.allowImages && (
                          <div className="item-images">
                            {/* Visa redan uppladdade bilder */}
                            <ImageGallery 
                              images={item.images} 
                              onDelete={(imageIndex) => handleDeleteImage(sectionIndex, itemIndex, imageIndex)} 
                            />
                            
                            {/* Bilduppladdare */}
                            <div className="image-upload-section">
                              <h5>Lägg till bild</h5>
                              <ImageUploader 
                                onImageUpload={(imageData) => handleImageUpload(sectionIndex, itemIndex, imageData)}
                                folder={`inspections/temp`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : item.type === 'checkbox' ? (
                      <div className="checkbox-item">
                        {editingQuestions ? (
                          <div className="edit-label">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleEditItem(sectionIndex, itemIndex, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(sectionIndex, itemIndex)}
                              className="button danger small"
                            >
                              Ta bort
                            </button>
                          </div>
                        ) : (
                          <label>
                            <input 
                              type="checkbox" 
                              checked={item.value}
                              onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'value', e.target.checked)}
                            />
                            {item.label}
                            {item.required && <span className="required">*</span>}
                          </label>
                        )}
                        
                        {/* Anteckningsfält */}
                        <textarea
                          placeholder="Anteckningar"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'notes', e.target.value)}
                          rows="2"
                        />
                        
                        {/* Bilduppladdning */}
                        {item.allowImages && (
                          <div className="item-images">
                            {/* Visa redan uppladdade bilder */}
                            <ImageGallery 
                              images={item.images} 
                              onDelete={(imageIndex) => handleDeleteImage(sectionIndex, itemIndex, imageIndex)} 
                            />
                            
                            {/* Bilduppladdare */}
                            <div className="image-upload-section">
                              <h5>Lägg till bild</h5>
                              <ImageUploader 
                                onImageUpload={(imageData) => handleImageUpload(sectionIndex, itemIndex, imageData)}
                                folder={`inspections/temp`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-item">
                        {editingQuestions ? (
                          <div className="edit-label">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleEditItem(sectionIndex, itemIndex, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(sectionIndex, itemIndex)}
                              className="button danger small"
                            >
                              Ta bort
                            </button>
                          </div>
                        ) : (
                          <label>
                            {item.label}
                            {item.required && <span className="required">*</span>}
                          </label>
                        )}
                        
                        <input 
                          type="text" 
                          value={item.value || ''}
                          onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'value', e.target.value)}
                          required={item.required}
                        />
                        
                        {/* Anteckningsfält */}
                        <textarea
                          placeholder="Anteckningar"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'notes', e.target.value)}
                          rows="2"
                        />
                        
                        {/* Bilduppladdning */}
                        {item.allowImages && (
                          <div className="item-images">
                            {/* Visa redan uppladdade bilder */}
                            <ImageGallery 
                              images={item.images} 
                              onDelete={(imageIndex) => handleDeleteImage(sectionIndex, itemIndex, imageIndex)} 
                            />
                            
                            {/* Bilduppladdare */}
                            <div className="image-upload-section">
                              <h5>Lägg till bild</h5>
                              <ImageUploader 
                                onImageUpload={(imageData) => handleImageUpload(sectionIndex, itemIndex, imageData)}
                                folder={`inspections/temp`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {editingQuestions && (
                  <div className="add-new-item">
                    {activeSectionForNewItem === sectionIndex ? (
                      <div className="new-item-form">
                        <div className="form-group">
                          <label htmlFor={`new-item-label-${sectionIndex}`}>Frågetext:</label>
                          <input
                            type="text"
                            id={`new-item-label-${sectionIndex}`}
                            value={newItemLabel}
                            onChange={(e) => setNewItemLabel(e.target.value)}
                            placeholder="Ange frågetext"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`new-item-type-${sectionIndex}`}>Typ:</label>
                          <select
                            id={`new-item-type-${sectionIndex}`}
                            value={newItemType}
                            onChange={(e) => setNewItemType(e.target.value)}
                          >
                            <option value="yesno">Ja/Nej-fråga</option>
                            <option value="checkbox">Kryssruta</option>
                            <option value="text">Textfält</option>
                            <option value="header">Rubrik</option>
                          </select>
                        </div>
                        <div className="new-item-actions">
                          <button
                            type="button"
                            onClick={() => setActiveSectionForNewItem(null)}
                            className="button secondary"
                          >
                            Avbryt
                          </button>
                          <button
                            type="button"
                            onClick={() => addNewItem(sectionIndex)}
                            className="button primary"
                          >
                            Lägg till
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveSectionForNewItem(sectionIndex)}
                        className="button secondary"
                      >
                        + Lägg till ny fråga
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate(`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`)}
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
              {saving ? 'Sparar...' : 'Spara kontroll'}
            </button>
          </div>
        </form>
      ) : (
        <p className="select-template-message">Välj en mall ovan för att starta en ny kontroll.</p>
      )}
    </div>
  );
};

export default InspectionForm;
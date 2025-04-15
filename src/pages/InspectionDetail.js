// src/pages/InspectionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import ImageUploader from '../components/ImageUploader';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { v4 as uuidv4 } from 'uuid';
import { useConfirmation } from '../components/ConfirmationProvider';

const InspectionDetail = () => {
  const { customerId, addressId, installationId, inspectionId } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [installation, setInstallation] = useState(null);
  const [template, setTemplate] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [savingAsNewTemplate, setSavingAsNewTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemType, setNewItemType] = useState('yesno');
  const [activeSectionForNewItem, setActiveSectionForNewItem] = useState(null);
  const confirmation = useConfirmation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Hämta besiktningsinformation
        const inspectionDoc = await getDoc(doc(db, 'inspections', inspectionId));
        
        if (!inspectionDoc.exists()) {
          setError('Besiktningen hittades inte');
          setLoading(false);
          return;
        }
        
        const inspectionData = {
          id: inspectionDoc.id,
          ...inspectionDoc.data()
        };
        
        setInspection(inspectionData);
        
        // Hämta anläggningsinformation
        const installationDoc = await getDoc(doc(db, 'installations', installationId));
        
        if (installationDoc.exists()) {
          setInstallation({
            id: installationDoc.id,
            ...installationDoc.data()
          });
        }

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
        
        // Hämta mallinformation
        if (inspectionData.templateId) {
          const templateDoc = await getDoc(doc(db, 'checklistTemplates', inspectionData.templateId));
          
          if (templateDoc.exists()) {
            setTemplate({
              id: templateDoc.id,
              ...templateDoc.data()
            });
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Kunde inte hämta besiktningsdata');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [inspectionId, installationId, addressId, customerId]);

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
    
    // Spara ändringarna i Firestore
    handleSave();
  };

  const handleDeleteImage = async (sectionIndex, itemIndex, imageIndex) => {
    confirmation.confirm({
      title: 'Ta bort bild',
      message: 'Är du säker på att du vill ta bort denna bild?',
      onConfirm: async () => {
        const updatedInspection = { ...inspection };
        const imageToDelete = updatedInspection.sections[sectionIndex].items[itemIndex].images[imageIndex];
        
        try {
          // Om bilden lagras i Firebase Storage, försök ta bort den
          if (imageToDelete.url && imageToDelete.url.includes('storage.googleapis.com')) {
            // Extrahera filvägen från URL:en
            const filePath = imageToDelete.path || extractPathFromUrl(imageToDelete.url);
            
            if (filePath) {
              console.log('Tar bort fil från Firebase Storage:', filePath);
              // Här kan du implementera ett API-anrop för att ta bort filen från Firebase Storage
              // För nu, fortsätter vi bara och tar bort referensen
            }
          }
          
          // Ta bort bildreferensen från inspektionen
          updatedInspection.sections[sectionIndex].items[itemIndex].images.splice(imageIndex, 1);
          setInspection(updatedInspection);
          
          // Stäng eventuellt öppen bildmodal
          setActiveImageModal(null);
          
          // Spara ändringarna i Firestore
          handleSave();
        } catch (err) {
          console.error('Error deleting image:', err);
          setError('Kunde inte ta bort bilden');
        }
      }
    });
  };
  
  
  // Hjälpfunktion för att extrahera filvägen från URL:en
  const extractPathFromUrl = (url) => {
    // URL format: https://storage.googleapis.com/soeldokumentation.appspot.com/folder/filename
    try {
      const bucketName = 'soeldokumentation.appspot.com';
      const parts = url.split(bucketName + '/');
      if (parts.length > 1) {
        return parts[1];
      }
      return null;
    } catch (err) {
      console.error('Error extracting path from URL:', err);
      return null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        sections: inspection.sections,
        updatedAt: serverTimestamp()
      });
      
      setEditMode(false);
      setEditingQuestions(false);
    } catch (err) {
      console.error('Error updating inspection:', err);
      setError('Kunde inte spara ändringar');
    } finally {
      setSaving(false);
    }
  };

  const completeInspection = async () => {
    // Kontrollera om alla obligatoriska fält är ifyllda
    let allRequiredFilled = true;
    
    for (const section of inspection.sections) {
      for (const item of section.items) {
        if (item.required && item.type !== 'header') {
          if (
            (item.type === 'yesno' && item.value === null) ||
            (item.type === 'checkbox' && !item.value) || 
            (item.type === 'text' && !item.value?.trim())
          ) {
            allRequiredFilled = false;
            break;
          }
        }
      }
      if (!allRequiredFilled) break;
    }
    
    if (!allRequiredFilled) {
      alert('Alla obligatoriska fält måste fyllas i innan besiktningen kan slutföras.');
      return;
    }
    
    setSaving(true);
    
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setInspection(prev => ({
        ...prev,
        status: 'completed',
        completedAt: new Date() // Placeholder tills serverTimestamp uppdateras
      }));
    } catch (err) {
      console.error('Error completing inspection:', err);
      setError('Kunde inte slutföra besiktningen');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort kontroll',
      message: 'Är du säker på att du vill ta bort denna kontroll?',
      onConfirm: async () => {
        setSaving(true);
        
        try {
          await deleteDoc(doc(db, 'inspections', inspectionId));
          navigate(`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`);
        } catch (err) {
          console.error('Error deleting inspection:', err);
          setError('Kunde inte ta bort kontrollen');
          setSaving(false);
        }
      }
    });
  };

  const toggleEditingQuestions = () => {
    if (inspection.status === 'completed') {
      alert('Du kan inte redigera frågor i en slutförd besiktning.');
      return;
    }
    setEditingQuestions(!editingQuestions);
    // Om vi stänger frågeredigeringen, spara ändringarna
    if (editingQuestions) {
      handleSave();
    }
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
    confirmation.confirm({
      title: 'Ta bort fråga',
      message: 'Är du säker på att du vill ta bort denna fråga?',
      onConfirm: () => {
        const updatedInspection = { ...inspection };
        updatedInspection.sections[sectionIndex].items.splice(itemIndex, 1);
        setInspection(updatedInspection);
      }
    });
  };

  const handleEditItem = (sectionIndex, itemIndex, newLabel) => {
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items[itemIndex].label = newLabel;
    setInspection(updatedInspection);
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
        description: `Skapad från besiktning för ${installation?.name || 'anläggning'}`,
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

  const generateInspectionPDF = async () => {
    if (!inspection || !installation || !customer || !address) {
      alert('Kunde inte generera PDF: Data saknas');
      return null;
    }
  
    setGeneratingPdf(true);
  
    try {
      // Skapa ny PDF med A4-format
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Konfigurera fonter
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      
      // Sidhuvud
      doc.text("Besiktningsprotokoll", pageWidth / 2, 20, { align: "center" });
      
      // Information om kund och anläggning
      doc.setLineWidth(0.5);
      doc.rect(14, 30, pageWidth - 28, 40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Kunduppgifter", 16, 38);
      doc.setFont("helvetica", "normal");
      doc.text(`Kund: ${customer?.name || 'Uppgift saknas'}`, 16, 46);
      doc.text(`Adress: ${address?.street || ''}, ${address?.postalCode || ''} ${address?.city || ''}`, 16, 54);
      doc.text(`Anläggning: ${installation?.name || 'Uppgift saknas'}`, 16, 62);
      
      // Besiktningsinformation
      doc.rect(14, 75, pageWidth - 28, 20);
      doc.setFont("helvetica", "bold");
      doc.text("Besiktningsuppgifter", 16, 83);
      doc.setFont("helvetica", "normal");
      
      const inspectionDate = inspection.createdAt 
        ? new Date(inspection.createdAt.seconds * 1000).toLocaleDateString() 
        : 'Okänt datum';
      
      doc.text(`Besiktningsdatum: ${inspectionDate}`, 16, 91);
      doc.text(`Status: ${inspection.status === 'completed' ? 'Slutförd' : 'Pågående'}`, pageWidth - 60, 91);
      
      // Generera varje sektion i besiktningen
      let yPosition = 110;
      
      for (let sectionIndex = 0; sectionIndex < inspection.sections.length; sectionIndex++) {
        const section = inspection.sections[sectionIndex];
        
        // Kontrollera om vi behöver en ny sida
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`${sectionIndex + 1}. ${section.title}`, 14, yPosition);
        yPosition += 12;
        doc.setFontSize(12);
        
        // Lägg till varje punkt i sektionen
        for (const item of section.items) {
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }
          
          if (item.type === 'header') {
            doc.setFont("helvetica", "bold");
            doc.text(item.label, 14, yPosition);
            yPosition += 8;
            doc.setFont("helvetica", "normal");
          } else if (item.type === 'yesno') {
            // Förbättrad Ja/Nej-fråga med korrekta checkboxar
            doc.setFont("helvetica", "normal");
            // Begränsa textlängden för att undvika överlappning med checkboxar
            let textWidth = doc.getStringUnitWidth(item.label) * doc.getFontSize() / doc.internal.scaleFactor;
            let maxWidth = pageWidth / 2 - 14 - 5; // Lämna utrymme till första kryssrutan
            
            if (textWidth > maxWidth) {
              // Om texten är för lång, dela upp den på flera rader
              let wrappedText = doc.splitTextToSize(item.label, maxWidth);
              doc.text(wrappedText, 14, yPosition - (wrappedText.length - 1) * 5);
            } else {
              doc.text(item.label, 14, yPosition);
            }
            
            // Rita "Ja" checkbox
            doc.rect(pageWidth / 2, yPosition - 4, 5, 5);
            
            // Fyll i "Ja" checkbox om värdet är "yes"
            if (item.value === 'yes') {
              // Gör ett tydligare kryss med linjer istället för text-symbol
              doc.setLineWidth(0.7);
              doc.line(pageWidth / 2, yPosition - 4, pageWidth / 2 + 5, yPosition + 1);
              doc.line(pageWidth / 2, yPosition + 1, pageWidth / 2 + 5, yPosition - 4);
              doc.setLineWidth(0.5);
            }
            
            doc.text("Ja", pageWidth / 2 + 7, yPosition);
            
            // Rita "Nej" checkbox
            doc.rect(pageWidth / 2 + 25, yPosition - 4, 5, 5);
            
            // Fyll i "Nej" checkbox om värdet är "no"
            if (item.value === 'no') {
              // Gör ett tydligare kryss med linjer istället för text-symbol
              doc.setLineWidth(0.7);
              doc.line(pageWidth / 2 + 25, yPosition - 4, pageWidth / 2 + 30, yPosition + 1);
              doc.line(pageWidth / 2 + 25, yPosition + 1, pageWidth / 2 + 30, yPosition - 4);
              doc.setLineWidth(0.5);
            }
            
            doc.text("Nej", pageWidth / 2 + 32, yPosition);
            
            yPosition += 10;
          } else if (item.type === 'checkbox') {
            // Checkbox
            doc.setFont("helvetica", "normal");
            doc.rect(14, yPosition - 4, 5, 5);
            
            if (item.value) {
              // Gör ett tydligare kryss med linjer istället för text-symbol
              doc.setLineWidth(0.7);
              doc.line(14, yPosition - 4, 19, yPosition + 1);
              doc.line(14, yPosition + 1, 19, yPosition - 4);
              doc.setLineWidth(0.5);
            }
            
            doc.text(item.label, 22, yPosition);
            yPosition += 10;
          } else {
            // Textfält
            doc.setFont("helvetica", "normal");
            doc.text(`${item.label}: ${item.value || '-'}`, 14, yPosition);
            yPosition += 10;
          }
          
          // Lägg till anteckningar om de finns
          if (item.notes && item.notes.trim() !== '' && item.notes !== '-') {
            doc.text(`Anteckningar: ${item.notes}`, 20, yPosition);
            yPosition += 10;
          }
          
          // Nämn antal bilder om det finns några
          if (item.images && item.images.length > 0) {
            doc.text(`Antal bilder: ${item.images.length}`, 20, yPosition);
            yPosition += 10;
          }
        }
        
        yPosition += 5; // Extra mellanrum mellan sektioner
      }
      
      // Underskrifter
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 40;
      } else {
        yPosition += 20;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Underskrifter", 14, yPosition);
      yPosition += 10;
      
      // Linjer för underskrifter
      doc.setDrawColor(0);
      doc.line(14, yPosition + 20, 100, yPosition + 20); // Besiktningsman
      doc.line(pageWidth - 100, yPosition + 20, pageWidth - 14, yPosition + 20); // Kund
      
      doc.setFont("helvetica", "normal");
      doc.text("Kontrollansvarig", 14, yPosition + 30);
      doc.text("Kund", pageWidth - 100, yPosition + 30);
      
      // Sidfot på alla sidor
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Kontroll - Sida ${i} av ${pageCount}`, 
          pageWidth / 2, 
          pageHeight - 10, 
          { align: 'center' });
      }
      
      return doc;
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Ett fel uppstod när PDF-dokumentet skulle skapas: ' + err.message);
      return null;
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleGeneratePDF = async () => {
    const doc = await generateInspectionPDF();
    if (doc) {
      // Spara PDF-filen
      doc.save(`Besiktning_${installationId}_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  // Komponent för bildmodal
  const ImageModal = ({ image, onClose, onDelete }) => {
    return (
      <div className="image-modal-overlay" onClick={onClose}>
        <div className="image-modal-content" onClick={e => e.stopPropagation()}>
          <div className="image-modal-header">
            <h3>{image.name}</h3>
            <button className="modal-close-button" onClick={onClose}>&times;</button>
          </div>
          <div className="image-modal-body">
            <img src={image.url} alt={image.name} className="modal-image" />
          </div>
          <div className="image-modal-footer">
            <button className="button primary" onClick={() => window.open(image.url, '_blank')}>
              Öppna i nytt fönster
            </button>
            {onDelete && (
              <button className="button danger" onClick={onDelete}>
                Ta bort bild
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!inspection) return <div>Kontrollen hittades inte</div>;

  return (
    <div className="inspection-detail">
      <div className="inspection-header">
        <h2>Kontroll {inspection.status === 'completed' ? '(Slutförd)' : '(Pågående)'}</h2>
        <div className="action-buttons">
          {!editMode && !editingQuestions ? (
            <>
            {inspection.status !== 'completed' && (
                <>
                <button
                    onClick={() => setEditMode(true)}
                    className="button secondary"
                    disabled={saving}
                >
                    Redigera svar
                </button>&nbsp;
                <button
                    onClick={toggleEditingQuestions}
                    className="button secondary"
                    disabled={saving}
                >
                    Redigera frågor
                </button>&nbsp;
                <button
                    onClick={completeInspection}
                    className="button primary"
                    disabled={saving}
                >
                    Slutför kontroll
                </button>
                </>
            )}
            <button
                onClick={() => setSavingAsNewTemplate(true)}
                className="button secondary"
                disabled={saving}
            >
                Spara som mall
            </button>&nbsp;
            <button
                onClick={handleDelete}
                className="button danger"
                disabled={saving}
            >
                Ta bort
            </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setEditMode(false);
                  setEditingQuestions(false);
                }}
                className="button secondary"
                disabled={saving}
              >
                Avbryt
              </button>
              <button 
                onClick={handleSave}
                className="button primary"
                disabled={saving}
              >
                {saving ? 'Sparar...' : 'Spara ändringar'}
              </button>
            </>
          )}
        </div>
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

      <div className="inspection-info">
        <p><strong>Anläggning:</strong> {installation ? installation.name : 'Okänd'}</p>
        <p><strong>Mall:</strong> {template ? template.name : 'Okänd'}</p>
        <p>
          <strong>Status:</strong> 
          <span className={`status ${inspection.status === 'completed' ? 'completed' : 'pending'}`}>
            {inspection.status === 'completed' ? 'Slutförd' : 'Pågående'}
          </span>
        </p>
        {inspection.completedAt && (
          <p><strong>Slutförd:</strong> {new Date(inspection.completedAt.seconds * 1000).toLocaleString()}</p>
        )}
      </div>

      <div className="inspection-checklist">
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
                        {editMode ? (
                          <>
                            <label className="radio-label">
                              <input
                                type="radio"
                                name={`yesno-${item.id}`}
                                checked={item.value === "yes"}
                                onChange={() => handleItemChange(sectionIndex, itemIndex, 'value', "yes")}
                                disabled={inspection.status === 'completed'}
                              />
                              Ja
                            </label>
                            <label className="radio-label">
                              <input
                                type="radio"
                                name={`yesno-${item.id}`}
                                checked={item.value === "no"}
                                onChange={() => handleItemChange(sectionIndex, itemIndex, 'value', "no")}
                                disabled={inspection.status === 'completed'}
                              />
                              Nej
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="radio-label">
                              <input
                                type="radio"
                                name={`yesno-${item.id}`}
                                checked={item.value === "yes"}
                                disabled
                              />
                              Ja
                            </label>
                            <label className="radio-label">
                              <input
                                type="radio"
                                name={`yesno-${item.id}`}
                                checked={item.value === "no"}
                                disabled
                              />
                              Nej
                            </label>
                          </>
                        )}
                      </div>
                      
                      {/* Anteckningsfält */}
                      {(item.notes || editMode) && (
                        <div className="notes-field">
                          {editMode ? (
                            <textarea
                              placeholder="Anteckningar"
                              value={item.notes || ''}
                              onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'notes', e.target.value)}
                              rows="2"
                              disabled={inspection.status === 'completed'}
                            />
                          ) : (
                            item.notes && <p className="notes">{item.notes}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Bildvisning och uppladdning */}
                      {item.allowImages && (
                        <div className="item-images">
                          {/* Visa uppladdade bilder */}
                          {Array.isArray(item.images) && item.images.length > 0 && (
                            <div className="image-gallery">
                              {item.images.map((image, imageIndex) => (
                                <div key={imageIndex} className="thumbnail-container">
                                  <img 
                                    src={image.url} 
                                    alt={`Bild ${imageIndex + 1}`} 
                                    className="image-thumbnail" 
                                    onClick={() => setActiveImageModal({ image, sectionIndex, itemIndex, imageIndex })}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Bilduppladdning */}
                          {editMode && inspection.status !== 'completed' && (
                            <div className="image-upload-section">
                              <h5>Lägg till bild</h5>
                              <ImageUploader 
                                onImageUpload={(imageData) => handleImageUpload(sectionIndex, itemIndex, imageData)}
                                folder={`inspections/${inspectionId}`}
                                disabled={inspection.status === 'completed'}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : item.type === 'checkbox' ? (
                    <div className="checkbox-item">
                      <label>
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
                          <>
                            {editMode ? (
                              <input 
                                type="checkbox" 
                                checked={item.value}
                                onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'value', e.target.checked)}
                                disabled={inspection.status === 'completed'}
                              />
                            ) : (
                              <input 
                                type="checkbox" 
                                checked={item.value} 
                                disabled 
                              />
                            )}
                            {item.label}
                            {item.required && <span className="required">*</span>}
                          </>
                        )}
                      </label>
                      
                      {/* Anteckningsfält */}
                      {(item.notes || editMode) && (
                        <div className="notes-field">
                          {editMode ? (
                            <textarea
                              placeholder="Anteckningar"
                              value={item.notes || ''}
                              onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'notes', e.target.value)}
                              rows="2"
                              disabled={inspection.status === 'completed'}
                            />
                          ) : (
                            item.notes && <p className="notes">{item.notes}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Bildvisning och uppladdning */}
                      {item.allowImages && (
                        <div className="item-images">
                          {/* Visa uppladdade bilder */}
                          {Array.isArray(item.images) && item.images.length > 0 && (
                            <div className="image-gallery">
                              {item.images.map((image, imageIndex) => (
                                <div key={imageIndex} className="thumbnail-container">
                                  <img 
                                    src={image.url} 
                                    alt={`Bild ${imageIndex + 1}`} 
                                    className="image-thumbnail" 
                                    onClick={() => setActiveImageModal({ image, sectionIndex, itemIndex, imageIndex })}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Bilduppladdning */}
                          {editMode && inspection.status !== 'completed' && (
                            <div className="image-upload-section">
                              <h5>Lägg till bild</h5>
                              <ImageUploader 
                                onImageUpload={(imageData) => handleImageUpload(sectionIndex, itemIndex, imageData)}
                                folder={`inspections/${inspectionId}`}
                                disabled={inspection.status === 'completed'}
                              />
                            </div>
                          )}
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
                      
                      {editMode ? (
                        <input 
                          type="text" 
                          value={item.value || ''}
                          onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'value', e.target.value)}
                          disabled={inspection.status === 'completed'}
                          required={item.required}
                        />
                      ) : (
                        <p className="text-value">{item.value || '-'}</p>
                      )}
                      
                      {/* Anteckningsfält */}
                      {(item.notes || editMode) && (
                        <div className="notes-field">
                          {editMode ? (
                            <textarea
                              placeholder="Anteckningar"
                              value={item.notes || ''}
                              onChange={(e) => handleItemChange(sectionIndex, itemIndex, 'notes', e.target.value)}
                              rows="2"
                              disabled={inspection.status === 'completed'}
                            />
                          ) : (
                            item.notes && <p className="notes">{item.notes}</p>
                          )}
                        </div>
                      )}
                      
                      {/* Bildvisning och uppladdning */}
                      {item.allowImages && (
                        <div className="item-images">
                          {/* Visa uppladdade bilder */}
                          {Array.isArray(item.images) && item.images.length > 0 && (
                            <div className="image-gallery">
                              {item.images.map((image, imageIndex) => (
                                <div key={imageIndex} className="thumbnail-container">
                                  <img 
                                    src={image.url} 
                                    alt={`Bild ${imageIndex + 1}`} 
                                    className="image-thumbnail" 
                                    onClick={() => setActiveImageModal({ image, sectionIndex, itemIndex, imageIndex })}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Bilduppladdning */}
                          {editMode && inspection.status !== 'completed' && (
                            <div className="image-upload-section">
                              <h5>Lägg till bild</h5>
                              <ImageUploader 
                                onImageUpload={(imageData) => handleImageUpload(sectionIndex, itemIndex, imageData)}
                                folder={`inspections/${inspectionId}`}
                                disabled={inspection.status === 'completed'}
                              />
                            </div>
                          )}
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
      </div>

      <div className="inspection-actions">
        <Link 
          to={`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`}
          className="button secondary"
        >
          Tillbaka till anläggning
        </Link>
        
        {inspection.status === 'completed' && (
          <button 
            className="button primary"
            onClick={handleGeneratePDF}
            disabled={generatingPdf}
          >
            {generatingPdf ? 'Genererar PDF...' : 'Generera PDF-rapport'}
          </button>
        )}
      </div>

      {/* Bildmodal */}
      {activeImageModal && (
        <ImageModal 
          image={activeImageModal.image}
          onClose={() => setActiveImageModal(null)}
          onDelete={editMode && inspection.status !== 'completed' ? 
            () => handleDeleteImage(
              activeImageModal.sectionIndex, 
              activeImageModal.itemIndex, 
              activeImageModal.imageIndex
            ) : null
          }
        />
      )}
    </div>
  );
};

export default InspectionDetail;
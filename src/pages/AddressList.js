// src/pages/InspectionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import ImageUploader from '../components/ImageUploader';
import { jsPDF } from "jspdf";


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
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
    if (!window.confirm('Är du säker på att du vill ta bort denna bild?')) {
      return;
    }
    
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items[itemIndex].images.splice(imageIndex, 1);
    
    setInspection(updatedInspection);
    
    // Stäng eventuellt öppen bildmodal
    setActiveImageModal(null);
    
    // Spara ändringarna i Firestore
    handleSave();
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        sections: inspection.sections,
        updatedAt: serverTimestamp()
      });
      
      setEditMode(false);
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
            (item.type === 'checkbox' && !item.value) || 
            (item.type === 'text' && !item.value.trim())
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
    if (!window.confirm('Är du säker på att du vill ta bort denna besiktning?')) {
      return;
    }
    
    setSaving(true);
    
    try {
      await deleteDoc(doc(db, 'inspections', inspectionId));
      navigate(`/customers/${customerId}/addresses/${addressId}/installations/${installationId}`);
    } catch (err) {
      console.error('Error deleting inspection:', err);
      setError('Kunde inte ta bort besiktningen');
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
      
      // Konfigurera fonter
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      
      // Sidhuvud
      doc.text("Besiktningsprotokoll", pageWidth / 2, 20, { align: "center" });
      
      // Information om kund och anläggning
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      
      // Skapa ruta för kundinfo
      doc.rect(14, 30, pageWidth - 28, 40);
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
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`${sectionIndex + 1}. ${section.title}`, 14, yPosition);
        yPosition += 10;
        doc.setFontSize(12);
        
        // Lägg till varje punkt i sektionen
        for (const item of section.items) {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          if (item.type === 'header') {
            doc.setFont("helvetica", "bold");
            doc.text(item.label, 14, yPosition);
            yPosition += 8;
          } else {
            doc.setFont("helvetica", "normal");
            const valueText = item.type === 'checkbox' 
              ? (item.value ? '✓' : '✗') 
              : (item.value || '-');
              
            doc.text(`${item.label}: ${valueText}`, 14, yPosition);
            yPosition += 7;
            
            if (item.notes) {
              doc.text(`Anteckningar: ${item.notes}`, 20, yPosition);
              yPosition += 7;
            }
            
            if (item.images && item.images.length > 0) {
              doc.text(`Antal bilder: ${item.images.length}`, 20, yPosition);
              yPosition += 7;
            }
            
            yPosition += 3; // Extra mellanrum mellan poster
          }
        }
        
        yPosition += 10; // Extra mellanrum mellan sektioner
      }
      
      // Underskrifter
      if (yPosition > 220) {
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
      doc.text("Besiktningsman", 14, yPosition + 30);
      doc.text("Kund", pageWidth - 100, yPosition + 30);
      
      // Sidfot på alla sidor
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Besiktningsprotokoll - Sida ${i} av ${pageCount}`, 
          pageWidth / 2, 
          doc.internal.pageSize.height - 10, 
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
  if (!inspection) return <div>Besiktningen hittades inte</div>;

  return (
    <div className="inspection-detail">
      <div className="inspection-header">
        <h2>Besiktning {inspection.status === 'completed' ? '(Slutförd)' : '(Pågående)'}</h2>
        <div className="action-buttons">
          {!editMode ? (
            <>
              {inspection.status !== 'completed' && (
                <>
                  <button 
                    onClick={() => setEditMode(true)}
                    className="button secondary"
                    disabled={saving}
                  >
                    Redigera
                  </button>
                  <button 
                    onClick={completeInspection}
                    className="button primary"
                    disabled={saving}
                  >
                    Slutför besiktning
                  </button>
                </>
              )}
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
                onClick={() => setEditMode(false)}
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
                    <h4>{item.label}</h4>
                  ) : item.type === 'checkbox' ? (
                    <div className="checkbox-item">
                      <label>
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
                      <label>
                        {item.label}
                        {item.required && <span className="required">*</span>}
                      </label>
                      
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
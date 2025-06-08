// src/pages/InspectionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import ImageUploader from '../components/ImageUploaderSupabase';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { v4 as uuidv4 } from 'uuid';
import { useConfirmation } from '../components/ConfirmationProvider';
import { supabase } from '../services/supabase';
import SimpleImageUploader from '../components/SimpleImageUploader';

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
  const [lastUploadSection, setLastUploadSection] = useState(null);
  const [lastUploadItem, setLastUploadItem] = useState(null);
  const sectionRefs = React.useRef({});
  const [itemImages, setItemImages] = useState({});
  const uploaderRefs = React.useRef({});
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

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
      
      // Säkerställ att varje item har en egen images-array
      const inspectionData = {
        id: inspectionDoc.id,
        ...inspectionDoc.data()
      };
      
      // Set up separate image tracking
      const imagesByItem = {};
      
      // Gå igenom varje sektion och item för att skapa nya images-arrayer
      if (inspectionData.sections) {
        inspectionData.sections.forEach((section, sectionIndex) => {
          if (section.items) {
            section.items.forEach((item, itemIndex) => {
              // Om images finns men är null, undefined eller inte en array, skapa en ny tom array
              if (!Array.isArray(item.images)) {
                item.images = [];
              }
              
              // Track images by item
              const itemKey = `${sectionIndex}_${itemIndex}`;
              if (item.images && item.images.length > 0) {
                imagesByItem[itemKey] = [...item.images];
              }
            });
          }
        });
      }
      
      // Set up our direct image tracking
      setItemImages(imagesByItem);
      
      console.log('Inspection data with initialized image arrays:', JSON.parse(JSON.stringify(inspectionData)));
      
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

const handleSaveName = async () => {
  const nameToSave = editedName.trim();
  
  if (!nameToSave) {
    alert('Kontrollnamnet kan inte vara tomt');
    return;
  }
  
  setSaving(true);
  
  try {
    // Update in Firestore
    await updateDoc(doc(db, 'inspections', inspectionId), {
      name: nameToSave,
      updatedAt: serverTimestamp()
    });
    
    // Update local state
    setInspection(prev => ({
      ...prev,
      name: nameToSave
    }));
    
    setEditingName(false);
  } catch (err) {
    console.error('Error updating inspection name:', err);
    setError('Kunde inte uppdatera namnet');
  } finally {
    setSaving(false);
  }
};

useEffect(() => {
  if (inspection) {
    // Initialize with current name or empty string, never undefined
    setEditedName(inspection.name || '');
  }
}, [inspection]);

  const handleItemChange = (sectionIndex, itemIndex, field, value) => {
    const updatedInspection = { ...inspection };
    updatedInspection.sections[sectionIndex].items[itemIndex][field] = value;
    setInspection(updatedInspection);
  };
  
  const handleFileButtonClick = (e, sectionIndex, itemIndex) => {
    e.preventDefault(); // Förhindra standardbeteende
    
    // Förhindra att sidan scrollar
    const currentScrollPosition = window.pageYOffset;
    
    // Hämta filuppladdaren via refs och klicka på den
    setTimeout(() => {
      if (uploaderRefs.current[`${sectionIndex}_${itemIndex}`]) {
        uploaderRefs.current[`${sectionIndex}_${itemIndex}`].click();
        
        // Återställ scroll-positionen
        window.scrollTo(0, currentScrollPosition);
      }
    }, 0);
  };
  
  // Funktion för att hantera bilder uppladdade från SimpleImageUploader
  const handleSimpleImageUpload = (imageData, sectionIndex, itemIndex) => {
    console.log(`Received image for section ${sectionIndex}, item ${itemIndex}:`, imageData);
    
    // Make a deep copy of the state
    const updatedInspection = JSON.parse(JSON.stringify(inspection));
    
    // Ensure the item has an images array
    if (!Array.isArray(updatedInspection.sections[sectionIndex].items[itemIndex].images)) {
      updatedInspection.sections[sectionIndex].items[itemIndex].images = [];
    }
    
    // Add the image data to the specific item
    updatedInspection.sections[sectionIndex].items[itemIndex].images.push(imageData);
    
    // Update state
    setInspection(updatedInspection);
    
    // Save to Firestore
    updateDoc(doc(db, 'inspections', inspectionId), {
      sections: updatedInspection.sections,
      updatedAt: serverTimestamp()
    }).catch(err => {
      console.error('Error saving image to Firestore:', err);
    });
  };
  const handleImageUpload = (sectionIndex, itemIndex, imageData) => {
    console.log(`BEFORE UPLOAD - Current inspection:`, JSON.parse(JSON.stringify(inspection)));
    console.log(`Uploading to section ${sectionIndex}, item ${itemIndex}`);
    console.log('Image data:', imageData);
    
    const updatedInspection = { ...inspection };
    const item = updatedInspection.sections[sectionIndex].items[itemIndex];
    
    // Initialisera images-array om den inte finns
    if (!Array.isArray(item.images)) {
      item.images = [];
      console.log(`Created new images array for section ${sectionIndex}, item ${itemIndex}`);
    }
    
    // Lägg till den nya bilden
    const newImage = {
      ...imageData,
      sectionIndex: sectionIndex,
      itemIndex: itemIndex
    };
    
    console.log(`Adding image to section ${sectionIndex}, item ${itemIndex}:`, newImage);
    item.images.push(newImage);
    
    console.log('AFTER UPLOAD - Images in this item:', JSON.parse(JSON.stringify(item.images)));
    console.log('AFTER UPLOAD - All items with images:');
    updatedInspection.sections.forEach((section, secIdx) => {
      section.items.forEach((itm, itmIdx) => {
        if (itm.images && itm.images.length > 0) {
          console.log(`Section ${secIdx}, Item ${itmIdx} has ${itm.images.length} images`);
        }
      });
    });
    
    // Spara direkt till state och Firestore
    setInspection(updatedInspection);
    handleSave(false);
  };

// Funktion för att hantera bilduppladdning från specifik fråga
const uploadImageForItem = async (sectionIndex, itemIndex, fileInputElement) => {
  if (!fileInputElement.files || !fileInputElement.files[0]) {
    console.log('No file selected');
    return;
  }
  
  const file = fileInputElement.files[0];
  console.log(`Uploading file for section ${sectionIndex}, item ${itemIndex}:`, file.name);
  
  try {
    // Unique path based on section and item
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `direct_${timestamp}_${sectionIndex}_${itemIndex}.${fileExt}`;
    const filePath = `inspections/direct/${inspectionId}/${sectionIndex}/${itemIndex}/${fileName}`;
    
    // Upload to Supabase
    const { data, error: uploadError } = await supabase.storage
      .from('inspections')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('inspections')
      .getPublicUrl(filePath);
    
    const imageData = {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      path: filePath,
      timestamp: timestamp,
      uniqueId: `${sectionIndex}_${itemIndex}_${timestamp}`
    };
    
    // Update our direct image tracking state
    const itemKey = `${sectionIndex}_${itemIndex}`;
    const updatedImages = { ...itemImages };
    
    if (!updatedImages[itemKey]) {
      updatedImages[itemKey] = [];
    }
    
    updatedImages[itemKey].push(imageData);
    setItemImages(updatedImages);
    
    // Save in the inspection object as well
    const updatedInspection = { ...inspection };
    if (!Array.isArray(updatedInspection.sections[sectionIndex].items[itemIndex].images)) {
      updatedInspection.sections[sectionIndex].items[itemIndex].images = [];
    }
    
    updatedInspection.sections[sectionIndex].items[itemIndex].images.push(imageData);
    setInspection(updatedInspection);
    
    // Save to Firestore
    await updateDoc(doc(db, 'inspections', inspectionId), {
      sections: updatedInspection.sections,
      updatedAt: serverTimestamp()
    });
    
    // Reset the file input
    fileInputElement.value = '';
    
  } catch (err) {
    console.error('Error uploading image:', err);
    alert(`Upload error: ${err.message}`);
  }
};

const handleDeleteImage = async (sectionIndex, itemIndex, imageIndex) => {
  confirmation.confirm({
    title: 'Ta bort bild',
    message: 'Är du säker på att du vill ta bort denna bild?',
    onConfirm: async () => {
      try {
        const updatedInspection = { ...inspection };
        const itemImages = updatedInspection.sections[sectionIndex].items[itemIndex].images;
        
        if (!itemImages || itemImages.length <= imageIndex) {
          console.error('Image not found at index:', imageIndex);
          return;
        }
        
        const imageToDelete = itemImages[imageIndex];
        console.log(`Deleting image from section ${sectionIndex}, item ${itemIndex}:`, imageToDelete);
        
        // Delete from storage
        if (imageToDelete.path) {
          const { error } = await supabase.storage
            .from('inspections')
            .remove([imageToDelete.path]);
            
          if (error) {
            console.error('Error deleting from storage:', error);
          }
        }
        
        // Remove from both main state and our tracking object
        itemImages.splice(imageIndex, 1);
        setInspection(updatedInspection);
        
        // Remove from our direct tracking
        const itemKey = `${sectionIndex}_${itemIndex}`;
        if (itemImages[itemKey]) {
          const updatedDirectImages = { ...itemImages };
          updatedDirectImages[itemKey].splice(imageIndex, 1);
          if (updatedDirectImages[itemKey].length === 0) {
            delete updatedDirectImages[itemKey];
          }
          setItemImages(updatedDirectImages);
        }
        
        // Save to Firestore
        await updateDoc(doc(db, 'inspections', inspectionId), {
          sections: updatedInspection.sections,
          updatedAt: serverTimestamp()
        });
        
        // Close image modal if open
        setActiveImageModal(null);
        
      } catch (err) {
        console.error('Error deleting image:', err);
        setError('Kunde inte ta bort bilden');
      }
    }
  });
};

const ItemImageUploader = ({ sectionIndex, itemIndex }) => {
  const [uploadStatus, setUploadStatus] = useState('');
  
  const handleTestUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadStatus('Uploading...');
    
    try {
      // Prepare image data
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `test_${timestamp}_sec${sectionIndex}_item${itemIndex}.${fileExt}`;
      const filePath = `inspections/test/${sectionIndex}/${itemIndex}/${fileName}`;
      
      // Upload to Supabase
      const { data, error: uploadError } = await supabase.storage
        .from('inspections')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inspections')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Manually update inspection state directly
      const updatedInspection = JSON.parse(JSON.stringify(inspection));
      if (!Array.isArray(updatedInspection.sections[sectionIndex].items[itemIndex].images)) {
        updatedInspection.sections[sectionIndex].items[itemIndex].images = [];
      }
      
      // Add image to the specific item
      const imageData = {
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        timestamp: timestamp,
        path: filePath,
        uniqueKey: `sec${sectionIndex}_item${itemIndex}_${timestamp}`
      };
      
      updatedInspection.sections[sectionIndex].items[itemIndex].images.push(imageData);
      
      console.log(`Added image to section ${sectionIndex}, item ${itemIndex}:`, imageData);
      console.log('Updated inspection state:', updatedInspection.sections[sectionIndex].items[itemIndex].images);
      
      setInspection(updatedInspection);
      
      // Save to Firestore
      await updateDoc(doc(db, 'inspections', inspectionId), {
        sections: updatedInspection.sections,
        updatedAt: serverTimestamp()
      });
      
      setUploadStatus('Upload successful!');
      setTimeout(() => setUploadStatus(''), 3000);
      
    } catch (err) {
      console.error('Test upload error:', err);
      setUploadStatus(`Error: ${err.message}`);
    }
  };
  
  return (
    <div className="test-uploader" style={{ marginTop: '10px', padding: '5px', border: '1px dashed #ccc', borderRadius: '8px' }}>
      <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>
        Test uploader (Section {sectionIndex}, Item {itemIndex})
      </p>
      
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleTestUpload} 
        style={{ fontSize: '14px' }}
      />
      
      {uploadStatus && (
        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: uploadStatus.includes('Error') ? 'red' : 'green' }}>
          {uploadStatus}
        </p>
      )}
    </div>
  );
};

const createItemSpecificUploader = (sectionIndex, itemIndex) => {
  return (imageData) => {
    console.log(`SPECIFIC UPLOADER: Uploading to section ${sectionIndex}, item ${itemIndex}`);
    
    // Skapa en djup kopia av hela inspection-objektet för att undvika referensproblem
    const updatedInspection = JSON.parse(JSON.stringify(inspection));
    
    // Hämta specifikt item
    const item = updatedInspection.sections[sectionIndex].items[itemIndex];
    
    // Se till att images-array finns
    if (!Array.isArray(item.images)) {
      item.images = [];
    }
    
    // Skapa bilddata med metadata för sektion och item
    const imageWithMetadata = {
      ...imageData,
      uploadedToSection: sectionIndex,
      uploadedToItem: itemIndex,
      uploadTimestamp: Date.now()
    };
    
    // Lägg till bilden till just detta item
    item.images.push(imageWithMetadata);
    
    // Logga alla bilder efter uppdatering
    console.log(`AFTER SPECIFIC UPLOAD - Images for section ${sectionIndex}, item ${itemIndex}:`, 
      JSON.parse(JSON.stringify(item.images)));
    
    // Uppdatera state och spara
    setInspection(updatedInspection);
    
    // Asynkront spara till Firestore
    setTimeout(() => {
      handleSave(false);
    }, 0);
  };
};

  const handleSave = async (resetEditMode = true) => {
    setSaving(true);
    
    try {
      await updateDoc(doc(db, 'inspections', inspectionId), {
        sections: inspection.sections,
        updatedAt: serverTimestamp()
      });
      
      // Endast återställ editMode om det explicit begärts
      if (resetEditMode) {
        setEditMode(false);
        setEditingQuestions(false);
      }
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
  const toggleNameEdit = () => {
    if (inspection.status === 'completed') {
      return;
    }
    // Initialize name if it was null/undefined
    if (!editedName && (!inspection.name || inspection.name === '')) {
      setEditedName('');
    }
    setEditingName(!editingName);
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
    
// ===== SNYGGARE LOGOTYP =====
// Position och storlek
const logoX = pageWidth - 79;
const logoY = 10;
const logoWidth = 73;
const logoHeight = 10;

// Rita en enkel rektangel med mörkgrå bakgrund
doc.setFillColor(50, 50, 50);
doc.rect(logoX, logoY, logoWidth, logoHeight, 'F');

// Lägg till texten
doc.setTextColor(255, 255, 255); // Vit text
doc.setFont("helvetica", "bold");
doc.setFontSize(20);
doc.text("Stig Olofssons El AB", logoX + logoWidth/2, logoY + logoHeight/2 + 1, { 
  align: "center", 
  baseline: "middle" 
});

// Återställ textfärg till svart
doc.setTextColor(0, 0, 0);


    // ===== SIDHUVUD =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Kontroll", 14, 20);
    
    // ===== KUNDUPPGIFTER =====
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(14, 30, pageWidth - 28, 45);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Kunduppgifter", 16, 38);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    // Kunduppgifter
    doc.text(`Kund: ${customer?.name || 'Uppgift saknas'}`, 16, 46);
    doc.text(`Adress: ${address?.street || ''}`, 16, 54);
    doc.text(`${address?.postalCode || ''} ${address?.city || ''}`, 16, 62);
    doc.text(`Anläggning: ${installation?.name || 'Uppgift saknas'} / ${inspection?.name || 'Namnlös kontroll'}`, 16, 70);
    
    // Datum och status
    const inspectionDate = inspection.createdAt 
      ? new Date(inspection.createdAt.seconds * 1000).toLocaleDateString() 
      : 'Okänt datum';
    
    doc.text(`Datum: ${inspectionDate}`, pageWidth - 90, 54);
    doc.text(`Status: ${inspection.status === 'completed' ? 'Slutförd' : 'Pågående'}`, pageWidth - 90, 62);
    
    // ===== INNEHÅLL =====
    
    // Preload images - Ladda bilder och deras dimensioner i förväg
    const imageCache = {};
    
    // Funktion för att ladda en bild från URL
    const loadImage = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";  // Viktigt för CORS
        img.onload = () => {
          // Skapa en canvas för att konvertera bilden
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Sätt canvas-dimensioner
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Rita bilden på canvas
          ctx.drawImage(img, 0, 0);
          
          // Konvertera till dataURL
          try {
            const dataUrl = canvas.toDataURL('image/jpeg');
            resolve({
              dataUrl,
              width: img.width,
              height: img.height
            });
          } catch (err) {
            // Om det inte går att få dataURL (oftast pga CORS)
            console.error('Kunde inte konvertera bild:', err);
            resolve(null); // Returnera null istället för att avvisa löftet
          }
        };
        
        img.onerror = () => {
          console.error('Kunde inte ladda bild:', url);
          resolve(null); // Returnera null istället för att avvisa löftet
        };
        
        img.src = url;
      });
    };
    
    // Ladda alla bilder i förväg
    try {
      const allImages = [];
      for (const section of inspection.sections) {
        for (const item of section.items) {
          if (item.images && item.images.length > 0) {
            for (const image of item.images) {
              if (image.url) {
                allImages.push({ 
                  url: image.url, 
                  key: image.url  // Använd URL som nyckel
                });
              }
            }
          }
        }
      }
      
      // Ladda alla unika bilder parallellt
      const uniqueImages = allImages.filter((img, index, self) => 
        self.findIndex(t => t.key === img.key) === index
      );
      
      console.log(`Laddar ${uniqueImages.length} bilder...`);
      
      const loadPromises = uniqueImages.map(async img => {
        try {
          const imageData = await loadImage(img.url);
          if (imageData) {
            imageCache[img.key] = imageData;
          }
        } catch (err) {
          console.error(`Kunde inte ladda bild: ${img.url}`, err);
        }
      });
      
      await Promise.all(loadPromises);
      console.log(`Laddade ${Object.keys(imageCache).length} av ${uniqueImages.length} bilder`);
    } catch (err) {
      console.error('Fel vid bildladdning:', err);
    }
    
    // Starta innehåll efter kunduppgifter
    let yPosition = 90;
    
    // Maximal bredd och höjd för bilder
    const maxImageWidth = 120;
    const maxImageHeight = 90;
    
    // Generera sektioner med bilder
    for (let sectionIndex = 0; sectionIndex < inspection.sections.length; sectionIndex++) {
      const section = inspection.sections[sectionIndex];
      
      // Kontrollera om vi behöver en ny sida
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Skapa sektionsrubrik
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`${sectionIndex + 1}. ${section.title}`, 14, yPosition);
      yPosition += 10;
      doc.setFontSize(11);
      
      // Process each item in the section
      for (let itemIndex = 0; itemIndex < section.items.length; itemIndex++) {
        const item = section.items[itemIndex];
        
        // Kontrollera om vi behöver en ny sida för detta objekt och dess bilder
        const hasImages = Array.isArray(item.images) && item.images.length > 0;
        const estimatedHeight = item.type === 'header' ? 8 : 10;
        const imageHeight = hasImages ? 
          Math.min(maxImageHeight, 40 * item.images.length) : 0;
          
        if (yPosition + estimatedHeight + imageHeight > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Hantera olika frågetyper
        if (item.type === 'header') {
          // Skriv rubriken
          doc.setFont("helvetica", "bold");
          doc.text(item.label, 20, yPosition);
          yPosition += 8;
          doc.setFont("helvetica", "normal");
        } else if (item.type === 'yesno') {
          // Ja/nej-fråga med kryssrutor
          doc.setFont("helvetica", "normal");
          doc.text(item.label, 20, yPosition);
          
          // Rita "Ja" kryssruta
          doc.rect(pageWidth - 45, yPosition - 4, 5, 5);
          
          // Fyll i "Ja" kryssruta om värdet är "yes"
          if (item.value === 'yes') {
            doc.line(pageWidth - 45, yPosition - 4, pageWidth - 40, yPosition + 1);
            doc.line(pageWidth - 45, yPosition + 1, pageWidth - 40, yPosition - 4);
          }
          
          doc.text("Ja", pageWidth - 38, yPosition);
          
          // Rita "Nej" kryssruta
          doc.rect(pageWidth - 28, yPosition - 4, 5, 5);
          
          // Fyll i "Nej" kryssruta om värdet är "no"
          if (item.value === 'no') {
            doc.line(pageWidth - 28, yPosition - 4, pageWidth - 23, yPosition + 1);
            doc.line(pageWidth - 28, yPosition + 1, pageWidth - 23, yPosition - 4);
          }
          
          doc.text("Nej", pageWidth - 22, yPosition);
          
          yPosition += 8;
        } else if (item.type === 'checkbox') {
          // Kryssruta
          doc.setFont("helvetica", "normal");
          doc.rect(20, yPosition - 4, 5, 5);
          
          if (item.value) {
            doc.line(20, yPosition - 4, 25, yPosition + 1);
            doc.line(20, yPosition + 1, 25, yPosition - 4);
          }
          
          doc.text(item.label, 28, yPosition);
          yPosition += 8;
        } else {
          // Textfält
          doc.setFont("helvetica", "normal");
          doc.text(`${item.label}: ${item.value || '-'}`, 20, yPosition);
          yPosition += 8;
        }
        
        // Lägg till anteckningar om det finns
        if (item.notes && item.notes.trim() !== '') {
          doc.setFont("helvetica", "italic");
          const notes = item.notes;
          const splitNotes = doc.splitTextToSize(notes, pageWidth - 50);
          doc.text(splitNotes, 25, yPosition);
          yPosition += splitNotes.length * 7;
          doc.setFont("helvetica", "normal");
        }
        
        // Lägg till bilder om det finns
        if (Array.isArray(item.images) && item.images.length > 0) {
          yPosition += 3;
          
          // Bildöverskrift
          doc.setFont("helvetica", "bold");
          doc.text("Bilder:", 20, yPosition);
          doc.setFont("helvetica", "normal");
          
          yPosition += 7;
          
          // Centrera bilder
          for (let i = 0; i < item.images.length; i++) {
            const image = item.images[i];
            
            // Kontrollera om vi behöver en ny sida för den här bilden
            if (yPosition + maxImageHeight/2 > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }
            
            // Försök lägga till bilden
            if (image.url && imageCache[image.url]) {
              try {
                const imageData = imageCache[image.url];
                
                // Beräkna dimensioner som behåller proportioner
                let imgWidth = maxImageWidth;
                let imgHeight = maxImageHeight;
                
                // Justera storleken för att behålla proportioner
                if (imageData.width && imageData.height) {
                  const aspectRatio = imageData.width / imageData.height;
                  
                  if (aspectRatio > 1) {
                    // Bred bild
                    imgHeight = imgWidth / aspectRatio;
                  } else {
                    // Hög bild
                    imgWidth = imgHeight * aspectRatio;
                  }
                  
                  // Ytterligare justering om bilden är för stor
                  if (imgWidth > maxImageWidth) {
                    const ratio = maxImageWidth / imgWidth;
                    imgWidth *= ratio;
                    imgHeight *= ratio;
                  }
                  
                  if (imgHeight > maxImageHeight) {
                    const ratio = maxImageHeight / imgHeight;
                    imgWidth *= ratio;
                    imgHeight *= ratio;
                  }
                }
                
                // Centrera bilden horisontellt
                const xPos = (pageWidth - imgWidth) / 2;
                
                // Lägg till bilden med bevarade proportioner
                doc.addImage(
                  imageData.dataUrl, 
                  'JPEG', 
                  xPos, 
                  yPosition, 
                  imgWidth, 
                  imgHeight
                );
                
                // Lägg till etikett under bilden
                doc.setFontSize(9);
                doc.text(`Bild ${i+1}`, pageWidth / 2, yPosition + imgHeight + 5, { align: 'center' });
                doc.setFontSize(11);
                
                // Uppdatera position
                yPosition += imgHeight + 10;
                
              } catch (err) {
                console.error('Kunde inte lägga till bild i PDF:', err);
                
                // Lägg till placeholder om bilden inte kunde laddas
                doc.setFillColor(240, 240, 240);
                doc.rect(pageWidth/2 - 40, yPosition, 80, 30, 'F');
                doc.setFontSize(9);
                doc.text(`Bild ${i+1}`, pageWidth / 2, yPosition + 15, { align: 'center' });
                doc.setFontSize(11);
                
                yPosition += 40;
              }
            } else {
              // Bild kunde inte laddas, lägg till placeholder
              doc.setFillColor(240, 240, 240);
              doc.rect(pageWidth/2 - 40, yPosition, 80, 30, 'F');
              doc.setFontSize(9);
              doc.text(`Bild ${i+1}`, pageWidth / 2, yPosition + 15, { align: 'center' });
              doc.setFontSize(11);
              
              yPosition += 40;
            }
          }
        }
        
        // Mindre mellanrum mellan frågorna
        yPosition += 2;
      }
    }
    
    // ===== UNDERSKRIFTER =====
    
    // Lägg till underskriftsfält i slutet
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 30;
    } else {
      yPosition += 20;
    }
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Underskrifter", 14, yPosition);
    yPosition += 20;
    
    // Linjer för underskrifter
    doc.line(30, yPosition, 85, yPosition); // Kontrollansvarig
    doc.line(pageWidth - 85, yPosition, pageWidth - 30, yPosition); // Kund
    
    doc.setFont("helvetica", "normal");
    doc.text("Kontrollansvarig", 30, yPosition + 10);
    doc.text("Kund", pageWidth - 85, yPosition + 10);
    
    // ===== SIDFOT =====
    
    // Lägg till sidnummer på alla sidor
    const pageCount = doc.internal.getNumberOfPages();
    const currentDate = new Date().toLocaleDateString();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Kontroll - Sida ${i} av ${pageCount}`, 14, pageHeight - 10);
      doc.text(currentDate, pageWidth - 14, pageHeight - 10, { align: 'right' });
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
  <div className="inspection-title">
    <h2>Kontroll {inspection.status === 'completed' ? '(Slutförd)' : '(Pågående)'}</h2>
    
    {editingName ? (
      <div className="name-edit-container">
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          autoFocus
          className="name-edit-input"
        />
        <div className="name-edit-actions">
          <button 
            onClick={() => setEditingName(false)}
            className="button secondary small"
            disabled={saving}
          >
            Avbryt
          </button>
          <button 
            onClick={handleSaveName}
            className="button primary small"
            disabled={saving}
          >
            {saving ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </div>
    ) : (
      <div 
        className={`inspection-name-display ${inspection.status !== 'completed' ? 'editable' : ''}`}
        onClick={() => inspection.status !== 'completed' && toggleNameEdit()}
      >
        <span className="name-label">Namn:</span>
        <span className="name-value">
          {inspection.name || 'Namnlös kontroll'}
          {inspection.status !== 'completed' && (
            <span className="edit-indicator"></span>
          )}
        </span>
      </div>
    )}
  </div>
  
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
                <div 
                  key={item.id} 
                  className="checklist-item"
                  ref={el => sectionRefs.current[`${sectionIndex}-${itemIndex}`] = el}
                >
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
                      
                      {/* Direct Image Handling */}
                      {item.allowImages && (
                        <div className="item-images">
                          {/* Visa uppladdade bilder */}
                          {Array.isArray(item.images) && item.images.length > 0 && (
                            <div className="image-gallery">
                              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>
                                Bilder för sektion {sectionIndex}, fråga {itemIndex}
                              </p>
                              {item.images.map((image, imageIndex) => (
                                <div key={image.uniqueId || imageIndex} className="thumbnail-container">
                                  <img 
                                    src={image.url} 
                                    alt={`Bild ${imageIndex + 1}`} 
                                    className="image-thumbnail" 
                                    onClick={() => setActiveImageModal({
                                      image,
                                      sectionIndex,
                                      itemIndex,
                                      imageIndex
                                    })}
                                  />
                                  {editMode && inspection.status !== 'completed' && (
                                    <button 
                                      className="thumbnail-delete" 
                                      onClick={() => handleDeleteImage(sectionIndex, itemIndex, imageIndex)}
                                      title="Ta bort bild"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                    {/* Simple Image Upload */}
                    {item.allowImages && editMode && inspection.status !== 'completed' && (
                      <div className="image-upload-section">
                        <h5>Lägg till bild</h5>
                        <SimpleImageUploader 
                          inspectionId={inspectionId}
                          sectionIndex={sectionIndex}
                          itemIndex={itemIndex}
                          onImageUploaded={handleSimpleImageUpload}
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
                      
                      {/* Direct Image Handling */}
                      {item.allowImages && (
                        <div className="item-images">
                          {/* Visa uppladdade bilder */}
                          {Array.isArray(item.images) && item.images.length > 0 && (
                            <div className="image-gallery">
                              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>
                                Bilder för sektion {sectionIndex}, fråga {itemIndex}
                              </p>
                              {item.images.map((image, imageIndex) => (
                                <div key={image.uniqueId || imageIndex} className="thumbnail-container">
                                  <img 
                                    src={image.url} 
                                    alt={`Bild ${imageIndex + 1}`} 
                                    className="image-thumbnail" 
                                    onClick={() => setActiveImageModal({
                                      image,
                                      sectionIndex,
                                      itemIndex,
                                      imageIndex
                                    })}
                                  />
                                  {editMode && inspection.status !== 'completed' && (
                                    <button 
                                      className="thumbnail-delete" 
                                      onClick={() => handleDeleteImage(sectionIndex, itemIndex, imageIndex)}
                                      title="Ta bort bild"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                {/* Simple Image Upload */}
                {item.allowImages && editMode && inspection.status !== 'completed' && (
                  <div className="image-upload-section">
                    <h5>Lägg till bild</h5>
                    <SimpleImageUploader 
                      inspectionId={inspectionId}
                      sectionIndex={sectionIndex}
                      itemIndex={itemIndex}
                      onImageUploaded={handleSimpleImageUpload}
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
                      
                      {/* Direct Image Handling */}
                      {item.allowImages && (
                        <div className="item-images">
                          {/* Visa uppladdade bilder */}
                          {Array.isArray(item.images) && item.images.length > 0 && (
                            <div className="image-gallery">
                              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>
                                Bilder för sektion {sectionIndex}, fråga {itemIndex}
                              </p>
                              {item.images.map((image, imageIndex) => (
                                <div key={image.uniqueId || imageIndex} className="thumbnail-container">
                                  <img 
                                    src={image.url} 
                                    alt={`Bild ${imageIndex + 1}`} 
                                    className="image-thumbnail" 
                                    onClick={() => setActiveImageModal({
                                      image,
                                      sectionIndex,
                                      itemIndex,
                                      imageIndex
                                    })}
                                  />
                                  {editMode && inspection.status !== 'completed' && (
                                    <button 
                                      className="thumbnail-delete" 
                                      onClick={() => handleDeleteImage(sectionIndex, itemIndex, imageIndex)}
                                      title="Ta bort bild"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
            {/* Simple Image Upload */}
            {item.allowImages && editMode && inspection.status !== 'completed' && (
              <div className="image-upload-section">
                <h5>Lägg till bild</h5>
                <SimpleImageUploader 
                  inspectionId={inspectionId}
                  sectionIndex={sectionIndex}
                  itemIndex={itemIndex}
                  onImageUploaded={handleSimpleImageUpload}
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
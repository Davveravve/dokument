import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

const SimpleImageUploader = ({ inspectionId, sectionIndex, itemIndex, onImageUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');

  const handleFileChange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      
      setUploading(true);
      setStatus('Laddar upp...');
      
      // Create unique file path
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `simple_${timestamp}_s${sectionIndex}_i${itemIndex}_${uuidv4()}.${fileExt}`;
      const filePath = `simple_uploads/${inspectionId}/${sectionIndex}/${itemIndex}/${fileName}`;
      
      // Upload file to Supabase
      const { data, error: uploadError } = await supabase.storage
        .from('inspections')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
        
      if (uploadError) throw uploadError;
      
      // Get URL
      const { data: urlData } = supabase.storage
        .from('inspections')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
      const imageData = {
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        path: filePath,
        timestamp,
        sectionIndex,
        itemIndex,
        uniqueId: `${sectionIndex}_${itemIndex}_${timestamp}`
      };
      
      // Clear input
      e.target.value = '';
      
      // Call the callback with the image data
      if (onImageUploaded) {
        onImageUploaded(imageData, sectionIndex, itemIndex);
      }
      
      setStatus('Uppladdning klar!');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setStatus(`Fel: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Use a completely unique ID for each instance
  const uniqueId = `simple-uploader-${sectionIndex}-${itemIndex}-${Math.random().toString(36).substring(2, 11)}`;

  return (
    <div className="simple-image-uploader" style={{ margin: '10px 0', padding: '10px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label htmlFor={uniqueId} style={{ display: 'inline-block', padding: '6px 12px', cursor: 'pointer', backgroundColor: '#6200ea', color: 'white', borderRadius: '4px' }}>
          Välj bild
        </label>
        <input 
          type="file" 
          id={uniqueId}
          accept="image/*" 
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        {status && (
          <span style={{ marginLeft: '10px', color: status.includes('Fel') ? 'red' : 'green' }}>
            {status}
          </span>
        )}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        Sektion: {sectionIndex}, Fråga: {itemIndex}
      </div>
    </div>
  );
};

export default SimpleImageUploader;
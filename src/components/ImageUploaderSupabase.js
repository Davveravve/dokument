import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

const ImageUploader = ({ onImageUpload, folder, disabled = false, sectionIndex = null, itemIndex = null }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

 const handleFileChange = async (e) => {
    e.preventDefault(); // Förhindra standardbeteende
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Endast bildfiler (JPG, PNG, GIF, WEBP) är tillåtna');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Bilden får inte vara större än 5MB');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      // Create a unique file name with section and item indexes as part of the path
      const folderPath = folder || 'images';
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${uuidv4()}.${fileExt}`;
      
      // Include section and item indexes in the path if they're provided
      const filePath = sectionIndex !== null && itemIndex !== null 
        ? `${folderPath}/section_${sectionIndex}/item_${itemIndex}/${fileName}`
        : `${folderPath}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('inspections') // Your bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progressEvent) => {
            const progressPercent = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            );
            setProgress(progressPercent);
          },
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inspections')
        .getPublicUrl(filePath);
      
      const publicUrl = urlData.publicUrl;
      
      // Notify parent component with metadata including section and item indexes
      onImageUpload({
        url: publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
        timestamp: timestamp,
        path: filePath,
        sectionIndex: sectionIndex,
        itemIndex: itemIndex
      });
      
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(`Ett fel uppstod vid uppladdning: ${err.message}`);
      setUploading(false);
    }
  };

  return (
    <div className="image-uploader">
      {error && <div className="upload-error">{error}</div>}
      
      <div className="upload-input">
        <input
          type="file"
          id={`image-upload-${sectionIndex || 0}-${itemIndex || 0}`}
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        <label 
          htmlFor={`image-upload-${sectionIndex || 0}-${itemIndex || 0}`} 
          className={`upload-button ${disabled ? 'disabled' : ''}`}
        >
          {uploading ? `Laddar upp... ${progress}%` : 'Välj bild'}
        </label>
      </div>
      
      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
// src/components/ImageUploader.js
import React, { useState } from 'react';

const ImageUploader = ({ onImageUpload, folder, disabled = false }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validera filtyp
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Endast bildfiler (JPG, PNG, GIF, WEBP) är tillåtna');
      return;
    }

    // Validera filstorlek (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Bilden får inte vara större än 5MB');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      // Visuell feedback av uppladdningsprogress
      setProgress(10);
      
      // Förbered FormData för att skicka filen
      const formData = new FormData();
      formData.append('image', file);
      
      // Lägg till mapp-information om tillgängligt
      if (folder) {
        formData.append('folder', folder);
      }
      
      setProgress(30);
      
      // Skicka filen till vår server-endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      setProgress(70);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Uppladdning misslyckades');
      }
      
      // Hämta URL:en och annan info från Firebase Storage
      const data = await response.json();
      
      // Skicka bildinfo till föräldrakomponenten
      onImageUpload({
        url: data.url,  // Detta är nu en Firebase Storage URL
        name: data.name,
        type: data.type,
        size: data.size,
        timestamp: data.timestamp
      });
      
      setProgress(100);
      
      // Kort fördröjning innan vi återställer uppladdningsstatusen
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
      
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(`Ett fel uppstod vid uppladdningen: ${err.message}`);
      setUploading(false);
    }
  };

  return (
    <div className="image-uploader">
      {error && <div className="upload-error">{error}</div>}
      
      <div className="upload-input">
        <input
          type="file"
          id="image-upload"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
        <label htmlFor="image-upload" className={`upload-button ${disabled ? 'disabled' : ''}`}>
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
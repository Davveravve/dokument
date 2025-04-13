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
      // Simulera en uppladdning
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(30);
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(60);
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgress(90);

      // Läs filen lokalt som data URL
      const reader = new FileReader();
      reader.onload = () => {
        const timestamp = new Date().getTime();
        
        // Skicka lokal bild info till callback
        onImageUpload({
          url: reader.result,  // Detta är en data URL
          name: file.name,
          type: file.type,
          size: file.size,
          timestamp: timestamp
        });
        
        setProgress(100);
        setUploading(false);
      };
      
      reader.onerror = () => {
        setError('Kunde inte läsa filen');
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (err) {
      console.error('Error handling file upload:', err);
      setError('Ett fel uppstod. Försök igen senare.');
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
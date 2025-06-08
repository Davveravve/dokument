import React, { useState } from 'react';
import { supabase } from '../services/supabase';

const SimpleSupabaseUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [error, setError] = useState(null);
  const [bucketName, setBucketName] = useState('inspections');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setError(null);
  };

  const handleBucketChange = (e) => {
    setBucketName(e.target.value);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      // Create file path
      const timestamp = Date.now();
      const filePath = `test-uploads/${timestamp}_${file.name}`;
      
      // Upload the file to the specified bucket
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get the public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      setUploadedImage({
        url: data.publicUrl,
        path: filePath,
        bucket: bucketName
      });
    } catch (err) {
      console.error('Error uploading:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!uploadedImage) return;
    
    try {
      const { error } = await supabase.storage
        .from(uploadedImage.bucket || bucketName)
        .remove([uploadedImage.path]);
        
      if (error) throw error;
      
      setUploadedImage(null);
      setFile(null);
    } catch (err) {
      console.error('Error deleting:', err);
      setError(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="simple-uploader" style={{ padding: '20px', maxWidth: '500px' }}>
      <h3>Enkel Supabase Uppladdare</h3>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="bucket-select" style={{ display: 'block', marginBottom: '5px' }}>
          Bucket:
        </label>
        <select 
          id="bucket-select"
          value={bucketName}
          onChange={handleBucketChange}
          style={{ 
            marginBottom: '10px',
            padding: '8px', 
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          <option value="inspections">inspections</option>
          <option value="public_images">public_images</option>
        </select>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
      
      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        style={{ 
          padding: '8px 15px', 
          backgroundColor: '#6200ea', 
          color: 'white', 
          border: 'none',
          borderRadius: '4px',
          marginRight: '10px'
        }}
      >
        {uploading ? 'Laddar upp...' : 'Ladda upp'}
      </button>
      
      {uploadedImage && (
        <div style={{ marginTop: '20px' }}>
          <h4>Uppladdad bild:</h4>
          <img 
            src={uploadedImage.url} 
            alt="Uploaded" 
            style={{ maxWidth: '100%', maxHeight: '300px', marginBottom: '10px' }} 
          />
          <p>URL: {uploadedImage.url}</p>
          <p>Path: {uploadedImage.path}</p>
          <p>Bucket: {uploadedImage.bucket}</p>
          
          <button 
            onClick={handleDelete}
            style={{ 
              padding: '8px 15px', 
              backgroundColor: '#f44336', 
              color: 'white', 
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Ta bort bild
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleSupabaseUploader;
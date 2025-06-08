import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload a file to Supabase storage
 * @param {File} file - The file to upload
 * @param {string} folder - The folder to upload to (e.g., 'inspections/123')
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} - Object with url, path, and file metadata
 */
export const uploadFile = async (file, folder = 'general', onProgress = null) => {
  if (!file) throw new Error('No file provided');

  // Create a unique file name
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${timestamp}_${uuidv4()}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;
  
  // Upload options
  const options = {
    cacheControl: '3600',
    upsert: false
  };
  
  // Add progress handler if provided
  if (onProgress && typeof onProgress === 'function') {
    options.onUploadProgress = (progressEvent) => {
      const progressPercent = Math.round(
        (progressEvent.loaded / progressEvent.total) * 100
      );
      onProgress(progressPercent);
    };
  }
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('inspections') // Your bucket name
    .upload(filePath, file, options);
    
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('inspections')
    .getPublicUrl(filePath);
  
  return {
    url: urlData.publicUrl,
    name: file.name,
    type: file.type,
    size: file.size,
    timestamp,
    path: filePath
  };
};

/**
 * Delete a file from Supabase storage
 * @param {string} filePath - The path to the file in storage
 * @returns {Promise<Object>} - Result of the delete operation
 */
export const deleteFile = async (filePath) => {
  if (!filePath) throw new Error('No file path provided');
  
  const { data, error } = await supabase.storage
    .from('inspections')
    .remove([filePath]);
    
  if (error) throw error;
  
  return { success: true, data };
};

/**
 * Extract file path from URL (for deletion)
 * @param {string} url - The public URL of the file
 * @returns {string|null} - The file path or null if not found
 */
export const getPathFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // URL format: https://xxxx.supabase.co/storage/v1/object/public/bucket-name/folder/filename
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the position after "public" and bucket name
    const bucketIndex = pathParts.indexOf('public') + 2;
    
    if (bucketIndex >= pathParts.length) return null;
    
    // Join the remaining parts to form the path
    return pathParts.slice(bucketIndex).join('/');
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
};
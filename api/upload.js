import { IncomingForm } from 'formidable';
import { put } from '@vercel/blob';
import fs from 'fs';

// Configure for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to parse form data
const parseForm = async (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const { fields, files } = await parseForm(req);
    
    const imageFile = files.image?.[0] || files.image; // Handle both formats that formidable might return
    if (!imageFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file content
    const fileBuffer = fs.readFileSync(imageFile.filepath || imageFile.path);

    // Prepare file details
    const folder = fields.folder?.[0] || fields.folder || 'images';
    const timestamp = Date.now();
    const fileName = `${timestamp}_${imageFile.originalFilename || imageFile.name}`;
    const filePath = `${folder}/${fileName}`;

    // Upload to Vercel Blob Storage
    const blob = await put(filePath, fileBuffer, {
      contentType: imageFile.mimetype || imageFile.type,
      access: 'public',
    });

    // Create and return URL
    res.status(200).json({
      url: blob.url,
      name: imageFile.originalFilename || imageFile.name,
      type: imageFile.mimetype || imageFile.type,
      size: imageFile.size,
      timestamp: timestamp,
      path: filePath
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
}
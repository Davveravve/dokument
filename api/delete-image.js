// pages/api/delete-image.js
import admin from 'firebase-admin';

// Konfigurera Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'soeldokumentation.appspot.com'
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Kontrollera om filen existerar
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Ta bort filen
    await file.delete();

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Delete failed', 
      details: error.message 
    });
  }
}
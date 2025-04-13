import multer from 'multer';
import admin from 'firebase-admin';
import initMiddleware from '../lib/init-middleware';

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

// Konfigurera multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Initiera middleware
const multerUpload = initMiddleware(upload.single('image'));

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Kör multer
    await multerUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = req.body.folder || 'images';
    const timestamp = Date.now();
    const fileName = `${timestamp}_${req.file.originalname}`;
    const filePath = `${folder}/${fileName}`;

    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Skapa en buffer från filen
    const fileBuffer = req.file.buffer;

    // Ladda upp filen till Firebase Storage
    await file.save(fileBuffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    // Gör filen offentlig
    await file.makePublic();

    // Skapa URL till filen
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    res.status(200).json({
      url: publicUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      timestamp: timestamp
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
}
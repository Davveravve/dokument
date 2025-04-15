// pages/api/upload.js
import multer from 'multer';
import admin from 'firebase-admin';
import initMiddleware from '../../lib/init-middleware';

// Konfigurera Firebase Admin
if (!admin.apps.length) {
  try {
    // Parse FIREBASE_SERVICE_ACCOUNT från miljövariabeln
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'soeldokumentation.appspot.com'
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

// Konfigurera multer för filhantering
const upload = multer({
  storage: multer.memoryStorage(), // Lagra filen i minnet tillfälligt
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB gräns
});

// Initiera middleware
const multerUpload = initMiddleware(upload.single('image'));

export const config = {
  api: {
    bodyParser: false, // Inaktivera Next.js inbyggda bodyParser för att använda multer
  },
};

export default async function handler(req, res) {
  // Tillåt endast POST-förfrågningar
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Hantera fil med multer
    await multerUpload(req, res);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Hämta och förbereda fildetaljer
    const folder = req.body.folder || 'images';
    const timestamp = Date.now();
    const fileName = `${timestamp}_${req.file.originalname}`;
    const filePath = `${folder}/${fileName}`;

    // Få åtkomst till Firebase Storage bucket
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);

    // Skapa en buffer från filen och ladda upp till Firebase Storage
    const fileBuffer = req.file.buffer;
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    // Gör filen offentligt tillgänglig
    await file.makePublic();

    // Skapa URL till filen
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Returnera metadata till klienten
    res.status(200).json({
      url: publicUrl,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      timestamp: timestamp,
      path: filePath // Lägger till sökvägen som kan vara användbar senare
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
}
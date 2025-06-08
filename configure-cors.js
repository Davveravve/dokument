// configure-cors.js
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-your-service-account-key.json'); // Ersätt med sökvägen till din service account-nyckel

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'soeldokumentation.appspot.com'
});

const bucket = admin.storage().bucket();

async function configureCors() {
  try {
    // Definiera CORS-konfigurationen
    const corsConfiguration = [
      {
        origin: ['http://localhost:3000', 'https://soeldokumentation.web.app', 'https://soeldokumentation.firebaseapp.com'],
        method: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        maxAgeSeconds: 3600
      }
    ];

    // Uppdatera CORS-konfigurationen
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('CORS configuration updated successfully!');
  } catch (error) {
    console.error('Error updating CORS configuration:', error);
  }
}

configureCors();
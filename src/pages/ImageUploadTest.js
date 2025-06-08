import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploaderSupabase';
import { supabase } from '../services/supabase';

const ImageUploadTest = () => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check for current Supabase session
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      setUser(data?.session?.user || null);
      setAuthLoading(false);
      
      // Setup auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user || null);
        }
      );
      
      return () => {
        authListener.subscription.unsubscribe();
      };
    };
    
    checkSession();
  }, []);

  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [signInMessage, setSignInMessage] = useState('');

  const handleSignIn = async () => {
    if (!showEmailInput) {
      setShowEmailInput(true);
      return;
    }

    if (!email || !email.includes('@')) {
      alert('Vänligen ange en giltig e-postadress');
      return;
    }

    try {
      setAuthLoading(true);
      setSignInMessage('');
      
      // Use magic link authentication (email OTP)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });
      
      if (error) throw error;
      
      setSignInMessage(`Ett inloggningsmail har skickats till ${email}. Kolla din inbox och klicka på länken för att logga in.`);
    } catch (error) {
      console.error("Error sending magic link:", error);
      alert(`Inloggningsfel: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleImageUpload = (imageData) => {
    setUploadedImages([...uploadedImages, imageData]);
  };

  const handleDeleteImage = async (index) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna bild?')) {
      return;
    }

    try {
      const imageToDelete = uploadedImages[index];
      
      if (imageToDelete.path) {
        // Delete from Supabase Storage directly
        const { error } = await supabase.storage
          .from('inspections')
          .remove([imageToDelete.path]);
        
        if (error) {
          throw new Error(error.message);
        }
      }
      
      // Remove from state
      const updatedImages = [...uploadedImages];
      updatedImages.splice(index, 1);
      setUploadedImages(updatedImages);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Ett fel uppstod när bilden skulle tas bort: ' + error.message);
    }
  };

  // Image modal component
  const ImageModal = ({ image, onClose, onDelete }) => {
    return (
      <div className="image-modal-overlay" onClick={onClose}>
        <div className="image-modal-content" onClick={e => e.stopPropagation()}>
          <div className="image-modal-header">
            <h3>{image.name}</h3>
            <button className="modal-close-button" onClick={onClose}>&times;</button>
          </div>
          <div className="image-modal-body">
            <img src={image.url} alt={image.name} className="modal-image" />
          </div>
          <div className="image-modal-footer">
            <button className="button primary" onClick={() => window.open(image.url, '_blank')}>
              Öppna i nytt fönster
            </button>
            <button className="button danger" onClick={onDelete}>
              Ta bort bild
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="image-upload-test">
      <h2>Testverktyg för bilduppladdning (Supabase)</h2>
      
      {/* Auth Status */}
      <div className="auth-section">
        <h3>Autentiseringsstatus</h3>
        {authLoading ? (
          <p>Laddar autentiseringsstatus...</p>
        ) : user ? (
          <div>
            <p>Inloggad som: {user.email || 'Anonym användare'}</p>
            <button 
              onClick={handleSignOut}
              className="button secondary"
            >
              Logga ut
            </button>
          </div>
        ) : (
          <div>
            <p>Inte inloggad. Du måste logga in för att ladda upp bilder.</p>
            {showEmailInput ? (
              <div className="email-login-form">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-postadress"
                  className="email-input"
                />
                <button 
                  onClick={handleSignIn}
                  className="button primary"
                  disabled={authLoading}
                >
                  {authLoading ? 'Skickar...' : 'Skicka inloggningslänk'}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSignIn}
                className="button primary"
              >
                Logga in med e-post
              </button>
            )}
            {signInMessage && <p className="signin-message">{signInMessage}</p>}
          </div>
        )}
      </div>
      
      <div className="upload-container">
        <h3>Ladda upp bild</h3>
        {user ? (
          <ImageUploader 
            onImageUpload={handleImageUpload} 
            folder="test-uploads"
            disabled={!user}
          />
        ) : (
          <p>Logga in för att ladda upp bilder</p>
        )}
      </div>
      
      <div className="uploaded-images-container">
        <h3>Uppladdade bilder ({uploadedImages.length})</h3>
        
        {uploadedImages.length === 0 ? (
          <p>Inga bilder uppladdade än. Använd uppladdaren ovan för att lägga till bilder.</p>
        ) : (
          <div className="image-gallery">
            {uploadedImages.map((image, index) => (
              <div key={index} className="thumbnail-container">
                <img 
                  src={image.url} 
                  alt={`Bild ${index + 1}`} 
                  className="image-thumbnail" 
                  onClick={() => setActiveImageModal({ image, index })}
                />
                <button 
                  className="thumbnail-delete" 
                  onClick={() => handleDeleteImage(index)}
                  title="Ta bort bild"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="image-info">
        <h3>Information om uppladdade bilder</h3>
        <pre>{JSON.stringify(uploadedImages, null, 2)}</pre>
      </div>
      
      <div className="navigation">
        <Link to="/" className="button secondary">
          Tillbaka till Dashboard
        </Link>
      </div>
      
      {/* Image modal */}
      {activeImageModal && (
        <ImageModal 
          image={activeImageModal.image}
          onClose={() => setActiveImageModal(null)}
          onDelete={() => {
            handleDeleteImage(activeImageModal.index);
            setActiveImageModal(null);
          }}
        />
      )}
    </div>
  );
};

export default ImageUploadTest;
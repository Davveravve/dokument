import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ImageUploader from '../components/ImageUploaderSupabase';
import { supabase } from '../services/supabase';

const ImageUploadTest = () => {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [activeImageModal, setActiveImageModal] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);

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

  const handleSignIn = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert('Vänligen fyll i både e-post och lösenord');
      return;
    }

    try {
      setAuthLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in:", error);
      alert(`Inloggningsfel: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      alert('Vänligen fyll i både e-post och lösenord');
      return;
    }
    
    if (password.length < 6) {
      alert('Lösenord måste vara minst 6 tecken');
      return;
    }

    try {
      setAuthLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });
      
      if (error) throw error;
      
      if (data.user.identities?.length === 0) {
        alert('En användare med denna e-post finns redan. Vänligen logga in istället.');
        setShowSignUp(false);
      } else {
        alert('Konto har skapats! Vänligen verifiera din e-post genom att klicka på länken vi skickat.');
      }
    } catch (error) {
      console.error("Error signing up:", error);
      alert(`Registreringsfel: ${error.message}`);
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
            <p>Inloggad som: {user.email}</p>
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
            <div className="auth-form">
              {!showSignUp ? (
                <>
                  <form onSubmit={handleSignIn} className="login-form">
                    <div className="form-group">
                      <label htmlFor="email">E-post</label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="password">Lösenord</label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="button primary"
                      disabled={authLoading}
                    >
                      {authLoading ? 'Loggar in...' : 'Logga in'}
                    </button>
                  </form>
                  <p>Inget konto? <button className="text-button" onClick={() => setShowSignUp(true)}>Registrera dig</button></p>
                </>
              ) : (
                <>
                  <form onSubmit={handleSignUp} className="signup-form">
                    <div className="form-group">
                      <label htmlFor="signup-email">E-post</label>
                      <input
                        type="email"
                        id="signup-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="signup-password">Lösenord (minst 6 tecken)</label>
                      <input
                        type="password"
                        id="signup-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="button primary"
                      disabled={authLoading}
                    >
                      {authLoading ? 'Registrerar...' : 'Registrera'}
                    </button>
                  </form>
                  <p>Har du redan ett konto? <button className="text-button" onClick={() => setShowSignUp(false)}>Logga in</button></p>
                </>
              )}
            </div>
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
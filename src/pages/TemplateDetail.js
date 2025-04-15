// src/pages/TemplateDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useConfirmation } from '../components/ConfirmationProvider';

const TemplateDetail = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const confirmation = useConfirmation();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const templateDoc = await getDoc(doc(db, 'checklistTemplates', templateId));
        
        if (!templateDoc.exists()) {
          setError('Mallen hittades inte');
          setLoading(false);
          return;
        }
        
        setTemplate({
          id: templateDoc.id,
          ...templateDoc.data()
        });
      } catch (err) {
        console.error('Error fetching template:', err);
        setError('Kunde inte hämta mallinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  const handleDelete = async () => {
    confirmation.confirm({
      title: 'Ta bort mall',
      message: 'Är du säker på att du vill ta bort denna mall? Detta kommer inte påverka redan skapade kontroller som använder mallen.',
      onConfirm: async () => {
        setLoading(true);
        
        try {
          await deleteDoc(doc(db, 'checklistTemplates', templateId));
          navigate('/templates');
        } catch (err) {
          console.error('Error deleting template:', err);
          setError('Kunde inte ta bort mall');
          setLoading(false);
        }
      }
    });
  };

  if (loading) return <div>Laddar...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!template) return <div>Mallen hittades inte</div>;

  return (
    <div className="template-detail">
      <div className="template-header">
        <h2>{template.name}</h2>
        <div className="action-buttons">
          <Link to={`/templates/edit/${templateId}`} className="button secondary">
            Redigera
          </Link>
          <button 
            onClick={handleDelete}
            className="button danger"
          >
            Ta bort
          </button>
        </div>
      </div>

      {template.description && (
        <p className="template-description">{template.description}</p>
      )}

      <div className="template-preview">
        <h3>Förhandsgranskning</h3>
        
        {template.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="preview-section">
            <h4>{section.title}</h4>
            
            <div className="preview-items">
              {section.items.map((item) => (
                <div key={item.id} className="preview-item">
                  {item.type === 'header' ? (
                    <h5>{item.label}</h5>
                  ) : item.type === 'yesno' ? (
                    <div className="yesno-preview">
                      <span className="item-label">{item.label}</span>
                      {item.required && <span className="required">*</span>}
                      <div className="radio-options">
                        <label className="radio-label">
                          <input type="radio" name={`preview-${item.id}`} disabled /> Ja
                        </label>
                        <label className="radio-label">
                          <input type="radio" name={`preview-${item.id}`} disabled /> Nej
                        </label>
                      </div>
                      {item.allowImages && <span className="has-images">🖼️</span>}
                    </div>
                  ) : item.type === 'checkbox' ? (
                    <div className="checkbox-preview">
                      <input type="checkbox" disabled /> 
                      <label>{item.label}</label>
                      {item.required && <span className="required">*</span>}
                      {item.allowImages && <span className="has-images">🖼️</span>}
                      {item.allowMultiple && <span className="allow-multiple">+</span>}
                    </div>
                  ) : (
                    <div className="text-preview">
                      <label>{item.label}</label>
                      {item.required && <span className="required">*</span>}
                      <input type="text" disabled placeholder="Textfält" />
                      {item.allowImages && <span className="has-images">🖼️</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="template-actions">
        <Link to="/templates" className="button secondary">
          Tillbaka till mallar
        </Link>
      </div>
    </div>
  );
};

export default TemplateDetail;
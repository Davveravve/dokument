// src/pages/TemplateList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesCollection = collection(db, 'checklistTemplates');
        const templatesSnapshot = await getDocs(templatesCollection);
        const templatesList = templatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTemplates(templatesList);
      } catch (err) {
        console.error("Error fetching templates:", err);
        setError("Kunde inte hämta mallar. Försök igen senare.");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (loading) return <div>Laddar mallar...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="template-list-page">
      <h2>Checklistemallar</h2>
      <p>Skapa och hantera dina mallar för kontroller.</p>
      
      <Link to="/templates/new" className="button primary">
        Skapa ny mall
      </Link>
      
      {templates.length === 0 ? (
        <p className="no-data-message">Inga mallar tillagda än. Skapa en mall för att komma igång.</p>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div key={template.id} className="template-card">
              <h3>{template.name}</h3>
              <p>{template.description || 'Ingen beskrivning'}</p>
              <div className="template-card-footer">
                <span>{template.sections ? `${template.sections.length} sektioner` : '0 sektioner'}</span>
                <Link to={`/templates/${template.id}`} className="button secondary">
                  Öppna
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateList;
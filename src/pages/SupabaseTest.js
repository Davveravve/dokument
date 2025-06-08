import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SimpleSupabaseUploader from '../components/SimpleSupabaseUploader';
import { supabase } from '../services/supabase';

const SupabaseTest = () => {
  const [supabaseInfo, setSupabaseInfo] = useState({
    url: process.env.REACT_APP_SUPABASE_URL || 'Not configured',
    hasAnonKey: Boolean(process.env.REACT_APP_SUPABASE_ANON_KEY)
  });
  
  const [connectionStatus, setConnectionStatus] = useState('checking');

  useEffect(() => {
    // Check if Supabase is working
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('supabasetest').select('*').limit(1).maybeSingle();
        
        // If this is the first time, the table won't exist, so we'll create it
        if (error && error.code === '42P01') { // Table doesn't exist
          try {
            const { error: createError } = await supabase.rpc('create_test_table');
            if (!createError) {
              setConnectionStatus('success');
            } else {
              setConnectionStatus('error');
              console.error('Failed to create test table:', createError);
            }
          } catch (err) {
            setConnectionStatus('error');
            console.error('RPC error:', err);
          }
        } else if (error) {
          setConnectionStatus('error');
          console.error('Connection test error:', error);
        } else {
          setConnectionStatus('success');
        }
      } catch (err) {
        console.error('Failed to check connection:', err);
        setConnectionStatus('error');
      }
    };

    checkConnection();
  }, []);

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'checking':
        return <p>Kontrollerar anslutning till Supabase...</p>;
      case 'success':
        return <p style={{ color: 'green' }}>✓ Anslutning till Supabase fungerar!</p>;
      case 'error':
        return <p style={{ color: 'red' }}>✗ Kunde inte ansluta till Supabase. Kontrollera konsolen för detaljer.</p>;
      default:
        return null;
    }
  };

  return (
    <div className="supabase-test">
      <h2>Supabase Test</h2>
      
      <div className="config-section" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Konfiguration</h3>
        <p><strong>Supabase URL:</strong> {supabaseInfo.url}</p>
        <p><strong>Anon Key:</strong> {supabaseInfo.hasAnonKey ? 'Konfigurerad' : 'Saknas'}</p>
        {renderConnectionStatus()}
      </div>

      <div className="upload-test-section">
        <h3>Test av bilduppladdning</h3>
        <SimpleSupabaseUploader />
      </div>
      
      <div className="navigation" style={{ marginTop: '30px' }}>
        <Link to="/" className="button secondary">
          Tillbaka till Dashboard
        </Link>
      </div>
    </div>
  );
};

export default SupabaseTest;
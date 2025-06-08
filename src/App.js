// src/App.js - Fixad routing
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfirmationProvider } from './components/ConfirmationProvider';
import MainLayout from './components/layout/MainLayout';
import AuthForm from './components/auth/AuthForm';
import Dashboard from './pages/Dashboard';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import CustomerForm from './pages/CustomerForm';
import AddressList from './pages/AddressList';
import AddressDetail from './pages/AddressDetail';
import InstallationList from './pages/InstallationList';
import InstallationDetail from './pages/InstallationDetail';
import AddressForm from './pages/AddressForm';
import InstallationForm from './pages/InstallationForm';
import TemplateList from './pages/TemplateList';
import TemplateBuilder from './pages/TemplateBuilder';
import TemplateDetail from './pages/TemplateDetail';
import InspectionForm from './pages/InspectionForm';
import InspectionDetail from './pages/InspectionDetail';
import ImageUploadTest from './pages/ImageUploadTest';
import SupabaseTest from './pages/SupabaseTest';
import SubscriptionManager from './components/subscription/SubscriptionManager';
import './App.css';

// Login wrapper
const LoginWrapper = () => {
  return (
    <div className="login-page">
      <div className="login-container">
        <AuthForm />
      </div>
    </div>
  );
};

// Huvud-App komponenten
function AppContent() {
  const { currentUser, loading } = useAuth();
  
  console.log('🏠 App state:', { 
    currentUser: !!currentUser, 
    loading,
    userEmail: currentUser?.email 
  });

  // Om vi laddar, visa loading
  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        <p>Laddar applikation...</p>
      </div>
    );
  }

  // Om ingen användare, visa login
  if (!currentUser) {
    return <LoginWrapper />;
  }

  // Användare inloggad - visa huvudapplikationen med MainLayout
  return (
    <ConfirmationProvider>
      <Routes>
        {/* Alla rutter är nu skyddade och använder MainLayout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          
          {/* Kunder */}
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:customerId" element={<CustomerDetail />} />
          <Route path="customers/:customerId/edit" element={<CustomerForm />} />
          
          {/* Adresser */}
          <Route path="customers/:customerId/addresses" element={<AddressList />} />
          <Route path="customers/:customerId/addresses/new" element={<AddressForm />} />
          <Route path="customers/:customerId/addresses/:addressId" element={<AddressDetail />} />
          <Route path="customers/:customerId/addresses/:addressId/edit" element={<AddressForm />} />
          
          {/* Anläggningar */}
          <Route path="customers/:customerId/addresses/:addressId/installations" element={<InstallationList />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/new" element={<InstallationForm />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/:installationId" element={<InstallationDetail />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/:installationId/edit" element={<InstallationForm />} />
          
          {/* KONTROLLER - DETTA ÄR VIKTIGT! */}
          <Route path="customers/:customerId/addresses/:addressId/installations/:installationId/inspections/new" element={<InspectionForm />} />
          <Route path="customers/:customerId/addresses/:addressId/installations/:installationId/inspections/:inspectionId" element={<InspectionDetail />} />
          
          {/* Mallar */}
          <Route path="templates" element={<TemplateList />} />
          <Route path="templates/new" element={<TemplateBuilder />} />
          <Route path="templates/:templateId" element={<TemplateDetail />} />
          <Route path="templates/:templateId/edit" element={<TemplateBuilder />} />
          
          {/* Andra sidor */}
          <Route path="subscription" element={<SubscriptionManager />} />
          
          {/* Enklare kontroll-rutter (för snabblänkar) */}
          <Route path="inspections/new" element={<InspectionForm />} />
          <Route path="inspections/:inspectionId" element={<InspectionDetail />} />
          
          {/* Test-sidor */}
          <Route path="test/images" element={<ImageUploadTest />} />
          <Route path="test/supabase" element={<SupabaseTest />} />
        </Route>
        
        {/* VIKTIGT: Fallback för okända rutter KAN INTE komma före specifika rutter */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfirmationProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
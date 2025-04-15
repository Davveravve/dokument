// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfirmationProvider } from './components/ConfirmationProvider';
import MainLayout from './components/layout/MainLayout';
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
import './App.css';

function App() {
  return (
    <ConfirmationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/new" element={<CustomerForm />} />
            <Route path="customers/:customerId" element={<CustomerDetail />} />
            <Route path="customers/:customerId/addresses" element={<AddressList />} />
            <Route path="customers/:customerId/addresses/:addressId" element={<AddressDetail />} />
            <Route path="customers/:customerId/addresses/:addressId/installations" element={<InstallationList />} />
            <Route path="customers/:customerId/addresses/:addressId/installations/:installationId" element={<InstallationDetail />} />
            <Route path="customers/:customerId/addresses/new" element={<AddressForm />} />
            <Route path="customers/:customerId/addresses/:addressId/installations/new" element={<InstallationForm />} />
            <Route path="templates" element={<TemplateList />} />
            <Route path="templates/new" element={<TemplateBuilder />} />
            <Route path="templates/:templateId" element={<TemplateDetail />} />
            <Route path="templates/edit/:templateId" element={<TemplateBuilder />} />
            <Route path="customers/:customerId/addresses/:addressId/installations/:installationId/inspections/new" element={<InspectionForm />} />
            <Route path="customers/:customerId/addresses/:addressId/installations/:installationId/inspections/:inspectionId" element={<InspectionDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfirmationProvider>
  );
}

export default App;
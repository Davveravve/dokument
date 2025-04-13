// src/pages/InstallationList.js
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const InstallationList = () => {
  const { customerId, addressId } = useParams();
  
  return (
    <div className="installation-list-page">
      <h2>Anläggningar</h2>
      <p>Lista över anläggningar för adress: {addressId}</p>
      <Link to={`/customers/${customerId}/addresses/${addressId}/installations/new`} className="button primary">
        Lägg till anläggning
      </Link>
      {/* Anläggningslistan kommer att implementeras här */}
      <p>Anläggningslistan implementeras senare.</p>
      <Link to={`/customers/${customerId}/addresses/${addressId}`} className="button secondary">
        Tillbaka till adress
      </Link>
    </div>
  );
};

export default InstallationList;
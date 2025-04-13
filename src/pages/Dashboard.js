// src/pages/Dashboard.js
import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <h2>Hantering</h2>
      
      <div className="dashboard-card-container">
        <div className="dashboard-card">
          <h3>Hantera kunder</h3>
          <p>Hantera kunder, adresser och anläggningar</p>
          <Link to="/customers" className="button primary">
            Visa kunder
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
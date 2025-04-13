// src/pages/CustomerList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customersCollection = collection(db, 'customers');
        const customersSnapshot = await getDocs(customersCollection);
        const customersList = customersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCustomers(customersList);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError("Kunde inte hämta kunder. Försök igen senare.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  if (loading) return <div>Laddar kunder...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="customer-list-page">
      <h2>Kunder</h2>
      <Link to="/customers/new" className="button primary">
        Lägg till ny kund
      </Link>
      
      {customers.length === 0 ? (
        <p>Inga kunder tillagda än. Lägg till en kund för att komma igång.</p>
      ) : (
        <ul className="customer-grid">
          {customers.map(customer => (
            <li key={customer.id} className="customer-card">
              <Link to={`/customers/${customer.id}`}>
                <h3>{customer.name}</h3>
                <p>{customer.contact}</p>
                <p>{customer.email}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomerList;
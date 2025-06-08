// lib/parse-form.js
import { IncomingForm } from 'formidable';

export const parseForm = async (req) => {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm();
    
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};
import { del } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Delete from Vercel Blob Storage
    await del(filePath);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
}
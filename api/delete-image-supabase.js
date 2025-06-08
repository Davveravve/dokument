import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient({ req, res });
    
    // Delete the file
    const { data, error } = await supabase.storage
      .from('inspections') // Your bucket name
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Delete failed', details: error.message });
    }

    res.status(200).json({ message: 'File deleted successfully', data });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed', details: error.message });
  }
}
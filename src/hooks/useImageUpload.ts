import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, folder = 'specials'): Promise<string | null> => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from('images').upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
      return null;
    }

    const { data } = supabase.storage.from('images').getPublicUrl(fileName);
    setUploading(false);
    return data.publicUrl;
  };

  return { upload, uploading };
}

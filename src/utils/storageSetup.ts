import { supabase } from '@/integrations/supabase/client';

export const ensureStorageBucket = async () => {
  try {
    console.log('Checking if product-images bucket exists...');
    
    // Try to list files from the bucket to see if it exists
    const { data, error } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1 });
    
    if (error) {
      console.error('Storage bucket error:', error);
      
      // If bucket doesn't exist, we need to create it
      if (error.message.includes('Bucket not found') || error.message.includes('404')) {
        console.log('Bucket not found, attempting to create it...');
        return await createStorageBucket();
      }
      
      return false;
    }
    
    console.log('Storage bucket exists and is accessible');
    return true;
  } catch (err) {
    console.error('Error checking storage bucket:', err);
    return false;
  }
};

export const createStorageBucket = async () => {
  try {
    console.log('Creating product-images storage bucket...');
    
    // Method 1: Try using SQL to insert into storage.buckets
    const { error: sqlError } = await supabase
      .from('storage.buckets')
      .insert({ 
        id: 'product-images', 
        name: 'product-images', 
        public: true,
        file_size_limit: 52428800, // 50MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
    
    if (sqlError) {
      console.error('Failed to create bucket via SQL:', sqlError);
      
      // Method 2: Try using RPC function if it exists
      const { error: rpcError } = await supabase.rpc('create_storage_bucket', {
        bucket_name: 'product-images',
        is_public: true
      });
      
      if (rpcError) {
        console.error('Failed to create bucket via RPC:', rpcError);
        
        // Method 3: Try direct SQL execution with raw query
        const { error: rawSqlError } = await supabase
          .rpc('exec_sql', {
            sql: `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
                  VALUES ('product-images', 'product-images', true, 52428800, 
                  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
                  ON CONFLICT (id) DO NOTHING;`
          });
        
        if (rawSqlError) {
          console.error('Failed to create bucket via raw SQL:', rawSqlError);
          return false;
        }
      }
    }
    
    console.log('Storage bucket created successfully');
    
    // Wait a moment for the bucket to be available
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the bucket was created
    const { data: verifyData, error: verifyError } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1 });
    
    if (verifyError) {
      console.error('Bucket creation verification failed:', verifyError);
      return false;
    }
    
    console.log('Storage bucket verified and accessible');
    return true;
  } catch (err) {
    console.error('Error creating storage bucket:', err);
    return false;
  }
};

export const testStorageUpload = async () => {
  try {
    // Create a small test file
    const testContent = 'test';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    const testFileName = `test-${Date.now()}.txt`;
    
    console.log('Testing storage upload...');
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(testFileName, testFile);
    
    if (error) {
      console.error('Storage upload test failed:', error);
      return false;
    }
    
    console.log('Storage upload test successful:', data);
    
    // Clean up test file
    await supabase.storage
      .from('product-images')
      .remove([testFileName]);
    
    return true;
  } catch (err) {
    console.error('Storage upload test error:', err);
    return false;
  }
};

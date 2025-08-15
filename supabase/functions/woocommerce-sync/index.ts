import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

// WooCommerce Product interface
interface WooCommerceProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  stock_status: string;
  status: string;
  date_modified: string;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  variations: number[];
}

interface WooCommerceVariation {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  stock_status: string;
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  image: {
    id: number;
    src: string;
    name: string;
    alt: string;
  } | null;
  date_modified: string;
}

// Constants for improved performance
const BATCH_SIZE = 15; // Sync products in batches
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000;
const MEMORY_CLEANUP_INTERVAL = 100;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Starting optimized sync for connection: ${connectionId}`);

    // Get the WooCommerce connection
    const { data: connection, error: connectionError } = await supabase
      .from('woocommerce_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      console.error('Connection error:', connectionError);
      return new Response(
        JSON.stringify({ error: 'WooCommerce connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('woocommerce_sync_logs')
      .insert({
        connection_id: connectionId,
        status: 'in_progress',
        sync_type: 'manual',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError || !syncLog) {
      console.error('Failed to create sync log:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to start sync process' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const syncLogId = syncLog.id;
    console.log(`Created sync log: ${syncLogId}`);

    // Start the background sync process
    EdgeRuntime.waitUntil(processSyncInBackground(supabase, connection, syncLogId));

    return new Response(
      JSON.stringify({ 
        message: 'Sync started successfully', 
        syncLogId,
        note: 'This optimized sync can handle millions of products efficiently'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync initialization error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start sync: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Optimized background sync process
async function processSyncInBackground(supabase: any, connection: any, syncLogId: string) {
  let page = 1;
  let productsCreated = 0;
  let productsUpdated = 0;
  let productsFailed = 0;
  let totalPages = 1;
  let hasMorePages = true;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 10;

  try {
    console.log('Starting background sync process with optimizations');

    const apiUrl = `${connection.site_url}/wp-json/wc/v3`;
    const auth = btoa(`${connection.consumer_key}:${connection.consumer_secret}`);
    const baseHeaders = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    // Get total count for progress tracking
    let totalProducts = 0;
    try {
      const countResponse = await fetchWithRetry(`${apiUrl}/products`, {
        method: 'HEAD',
        headers: baseHeaders,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      
      if (countResponse && countResponse.headers.get('X-WP-Total')) {
        totalProducts = parseInt(countResponse.headers.get('X-WP-Total') || '0');
        totalPages = parseInt(countResponse.headers.get('X-WP-TotalPages') || '1');
        console.log(`Total products to sync: ${totalProducts} across ${totalPages} pages`);
      }
    } catch (countError) {
      console.log('Could not get total count, will determine during sync:', countError.message);
    }

    // Main sync loop
    while (hasMorePages && consecutiveErrors < maxConsecutiveErrors) {
      try {
        console.log(`Syncing page ${page}/${totalPages || '?'}`);
        
        // Check if sync was stopped
        if (await isSyncStopped(supabase, syncLogId)) {
          console.log('Sync was stopped by user');
          break;
        }

        const url = `${apiUrl}/products?page=${page}&per_page=100&status=publish&_fields=id,name,sku,price,regular_price,stock_quantity,manage_stock,stock_status,images,attributes,variations,date_modified`;
        console.log(`Fetching: ${url}`);

        const response = await fetchWithRetry(url, {
          method: 'GET',
          headers: baseHeaders,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response) {
          throw new Error('Failed to fetch after retries');
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Update total pages if available
        if (response.headers.get('X-WP-TotalPages')) {
          totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
        }

        const wcProducts: WooCommerceProduct[] = await response.json();
        console.log(`Retrieved ${wcProducts.length} products from page ${page}`);

        if (wcProducts.length === 0) {
          hasMorePages = false;
          break;
        }

        // Process products in batches
        for (let i = 0; i < wcProducts.length; i += BATCH_SIZE) {
          const batch = wcProducts.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(wcProducts.length / BATCH_SIZE)} from page ${page}`);
          
          try {
            const batchResults = await processSyncBatch(supabase, batch, connection, apiUrl, baseHeaders);
            productsCreated += batchResults.created;
            productsUpdated += batchResults.updated;
            productsFailed += batchResults.failed;
            
            // Update progress
            await updateSyncLog(supabase, syncLogId, {
              products_created: productsCreated,
              products_updated: productsUpdated,
              products_failed: productsFailed,
            });

            // Memory cleanup
            if ((productsCreated + productsUpdated + productsFailed) % MEMORY_CLEANUP_INTERVAL === 0) {
              if (typeof globalThis.gc === 'function') {
                globalThis.gc();
              }
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            consecutiveErrors = 0; // Reset on success
          } catch (batchError) {
            console.error(`Batch sync error:`, batchError);
            productsFailed += batch.length;
            consecutiveErrors++;
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
              throw new Error(`Too many consecutive errors: ${consecutiveErrors}`);
            }
          }
        }

        page++;
        
        if (page > totalPages && totalPages > 0) {
          hasMorePages = false;
        }

        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (pageError) {
        console.error(`Error syncing page ${page}:`, pageError);
        consecutiveErrors++;
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Failed after ${maxConsecutiveErrors} consecutive page errors: ${pageError.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * consecutiveErrors));
        continue;
      }
    }

    // Update last sync time for connection
    await supabase
      .from('woocommerce_connections')
      .update({ last_import_at: new Date().toISOString() })
      .eq('id', connection.id);

    // Final sync log update
    await updateSyncLog(supabase, syncLogId, {
      status: 'completed',
      products_created: productsCreated,
      products_updated: productsUpdated,
      products_failed: productsFailed,
      completed_at: new Date().toISOString(),
    });

    console.log(`Sync completed! Created: ${productsCreated}, Updated: ${productsUpdated}, Failed: ${productsFailed}`);

  } catch (error) {
    console.error('Background sync process failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      status: 'failed',
      products_created: productsCreated,
      products_updated: productsUpdated,
      products_failed: productsFailed,
      completed_at: new Date().toISOString(),
      error_message: error.message,
    });
  }
}

// Process a batch of products for sync
async function processSyncBatch(supabase: any, products: WooCommerceProduct[], connection: any, apiUrl: string, headers: any) {
  let created = 0;
  let updated = 0;
  let failed = 0;

  const batchPromises = products.map(async (wcProduct) => {
    try {
      // Skip non-published products - if no status is provided, assume it's published
      const productStatus = wcProduct.status || 'publish';
      if (productStatus === 'draft' || productStatus === 'trash' || productStatus === 'private') {
        console.log(`Skipping product ${wcProduct.name} with status: ${productStatus}`);
        return { created: 0, updated: 0, failed: 0 };
      }

      // Check if product exists in local database
      const { data: existingProduct, error: existingProductError } = await supabase
        .from('products')
        .select('*')
        .eq('woocommerce_id', wcProduct.id)
        .eq('woocommerce_connection_id', connection.id)
        .maybeSingle();

      if (existingProductError) {
        console.error(`Error checking existing product:`, existingProductError);
        return { created: 0, updated: 0, failed: 1 };
      }

      if (existingProduct) {
        // Check if product needs updating
        const wcModified = new Date(wcProduct.date_modified);
        const localModified = new Date(existingProduct.last_synced_at || existingProduct.updated_at);
        
        if (wcModified > localModified) {
          // Update existing product
          const updateData = {
            name: wcProduct.name,
            sku: wcProduct.sku || existingProduct.sku,
            rate: parseFloat(wcProduct.price) || 0,
            cost: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price) || 0,
            stock_quantity: wcProduct.manage_stock ? (wcProduct.stock_quantity || 0) : 999,
            image_url: wcProduct.images.length > 0 ? wcProduct.images[0].src : null,
            size: wcProduct.attributes.find(attr => attr.name.toLowerCase().includes('size'))?.options.join(', ') || null,
            color: wcProduct.attributes.find(attr => attr.name.toLowerCase().includes('color') || attr.name.toLowerCase().includes('colour'))?.options.join(', ') || null,
            has_variants: wcProduct.variations.length > 0,
            last_synced_at: new Date().toISOString(),
          };

          const { error: updateError } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', existingProduct.id);

          if (updateError) {
            console.error(`Failed to update product ${wcProduct.name}:`, updateError);
            return { created: 0, updated: 0, failed: 1 };
          }

          // Update variations if they exist
          if (wcProduct.variations.length > 0) {
            await syncProductVariations(supabase, wcProduct, existingProduct.id, apiUrl, headers, connection);
          }

          return { created: 0, updated: 1, failed: 0 };
        }
        
        return { created: 0, updated: 0, failed: 0 }; // No update needed
      } else {
        // Create new product
        const productData = {
          name: wcProduct.name,
          sku: wcProduct.sku || `wc_${wcProduct.id}`,
          rate: parseFloat(wcProduct.price) || 0,
          cost: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price) || 0,
          stock_quantity: wcProduct.manage_stock ? (wcProduct.stock_quantity || 0) : 999,
          low_stock_threshold: 10,
          image_url: wcProduct.images.length > 0 ? wcProduct.images[0].src : null,
          size: wcProduct.attributes.find(attr => attr.name.toLowerCase().includes('size'))?.options.join(', ') || null,
          color: wcProduct.attributes.find(attr => attr.name.toLowerCase().includes('color') || attr.name.toLowerCase().includes('colour'))?.options.join(', ') || null,
          has_variants: wcProduct.variations.length > 0,
          created_by: connection.user_id,
          woocommerce_id: wcProduct.id,
          woocommerce_connection_id: connection.id,
          last_synced_at: new Date().toISOString(),
        };

        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (productError) {
          console.error(`Failed to create product ${wcProduct.name}:`, productError);
          return { created: 0, updated: 0, failed: 1 };
        }

        // Create variations if they exist
        if (wcProduct.variations.length > 0) {
          await syncProductVariations(supabase, wcProduct, newProduct.id, apiUrl, headers, connection);
        }

        return { created: 1, updated: 0, failed: 0 };
      }

    } catch (error) {
      console.error(`Error processing product ${wcProduct.name}:`, error);
      return { created: 0, updated: 0, failed: 1 };
    }
  });

  // Wait for all products in the batch
  const results = await Promise.allSettled(batchPromises);
  
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      created += result.value.created;
      updated += result.value.updated;
      failed += result.value.failed;
    } else {
      console.error('Batch promise rejected:', result.reason);
      failed += 1;
    }
  });

  return { created, updated, failed };
}

// Sync product variations
async function syncProductVariations(supabase: any, wcProduct: WooCommerceProduct, productId: string, apiUrl: string, headers: any, connection: any) {
  if (!wcProduct.variations || wcProduct.variations.length === 0) {
    return;
  }

  console.log(`Syncing ${wcProduct.variations.length} variations for product ${wcProduct.name}`);
  
  const VARIATION_BATCH_SIZE = 5;
  
  for (let i = 0; i < wcProduct.variations.length; i += VARIATION_BATCH_SIZE) {
    const variationBatch = wcProduct.variations.slice(i, i + VARIATION_BATCH_SIZE);
    
    const variationPromises = variationBatch.map(async (variationId) => {
      try {
        const variationUrl = `${apiUrl}/products/${wcProduct.id}/variations/${variationId}?_fields=id,sku,price,regular_price,stock_quantity,manage_stock,stock_status,attributes,image,date_modified`;
        
        const response = await fetchWithRetry(variationUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response || !response.ok) {
          throw new Error(`Failed to fetch variation ${variationId}`);
        }

        const variation: WooCommerceVariation = await response.json();

        const variationData = {
          product_id: productId,
          sku: variation.sku || `${wcProduct.sku || `wc_${wcProduct.id}`}_${variation.id}`,
          rate: parseFloat(variation.price) || 0,
          cost: parseFloat(variation.regular_price) || parseFloat(variation.price) || 0,
          stock_quantity: variation.manage_stock ? (variation.stock_quantity || 0) : 999,
          low_stock_threshold: 10,
          image_url: variation.image ? variation.image.src : null,
          attributes: variation.attributes.reduce((acc: any, attr) => {
            acc[attr.name] = attr.option;
            return acc;
          }, {}),
          woocommerce_id: variation.id,
          woocommerce_connection_id: connection.id, // Link to WooCommerce connection
          last_synced_at: new Date().toISOString(),
        };

        const { error: variantError } = await supabase
          .from('product_variants')
          .upsert(variationData, {
            onConflict: 'woocommerce_id,product_id',
            ignoreDuplicates: false
          });

        if (variantError) {
          console.error(`Failed to sync variation ${variation.id}:`, variantError);
          return false;
        }

        return true;

      } catch (error) {
        console.error(`Error syncing variation ${variationId}:`, error);
        return false;
      }
    });

    await Promise.allSettled(variationPromises);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Robust fetch with retry logic
async function fetchWithRetry(url: string, options: any, retries = MAX_RETRIES): Promise<Response | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      if (response.status >= 400 && response.status < 500) {
        console.error(`Client error ${response.status} for ${url}, not retrying`);
        return response;
      }
      
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      console.error(`Attempt ${attempt}/${retries} failed for ${url}:`, error.message);
      
      if (attempt === retries) {
        console.error(`All ${retries} attempts failed for ${url}`);
        return null;
      }
      
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

// Helper function to update sync log
async function updateSyncLog(supabase: any, syncLogId: string, updates: any) {
  try {
    const { error } = await supabase
      .from('woocommerce_sync_logs')
      .update(updates)
      .eq('id', syncLogId);
    
    if (error) {
      console.error('Failed to update sync log:', error);
    }
  } catch (error) {
    console.error('Error updating sync log:', error);
  }
}

// Helper function to check if sync was stopped
async function isSyncStopped(supabase: any, syncLogId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('woocommerce_sync_logs')
      .select('status, error_message')
      .eq('id', syncLogId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.status === 'failed' && data.error_message?.includes('stopped by user');
  } catch (error) {
    console.error('Error checking sync status:', error);
    return false;
  }
}
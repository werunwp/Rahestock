import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Type definitions for WooCommerce API
interface WooCommerceProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  stock_status: string;
  images: Array<{
    id: number;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    slug: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
    option_ids?: number[];
  }>;
  variations: number[];
  date_modified: string;
  description?: string;
  short_description?: string;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  categories?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
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
  image?: {
    id: number;
    src: string;
    name: string;
    alt: string;
  };
  description?: string;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
}

// Configuration constants
const BATCH_SIZE = 10; // Smaller batch for reliability
const REQUEST_TIMEOUT = 20000; // 20 seconds
const MAX_RETRIES = 3;
const PRODUCTS_PER_PAGE = 50; // Smaller page size for stability

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { connectionId } = await req.json();

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get WooCommerce connection details
    const { data: connection, error: connectionError } = await supabase
      .from('woocommerce_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connectionError || !connection) {
      console.error('Connection error:', connectionError);
      return new Response(
        JSON.stringify({ error: 'WooCommerce connection not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create import log
    const { data: importLog, error: logError } = await supabase
      .from('woocommerce_import_logs')
      .insert({
        connection_id: connectionId,
        status: 'running',
        progress_message: 'Starting import...'
      })
      .select()
      .single();

    if (logError || !importLog) {
      console.error('Failed to create import log:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to start import' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting optimized import for connection: ${connectionId}`);
    console.log(`Created import log: ${importLog.id}`);

    // Start the background import process
    EdgeRuntime.waitUntil(processImportInBackground(supabase, connection, importLog.id));

    return new Response(
      JSON.stringify({ 
        success: true, 
        importLogId: importLog.id,
        message: 'Import started successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Import initialization error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Comprehensive background import process
async function processImportInBackground(supabase: any, connection: any, importLogId: string) {
  let page = 1;
  let importedCount = 0;
  let failedCount = 0;
  let totalPages = 1;
  let hasMorePages = true;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 5;

  try {
    console.log('Starting comprehensive import process');

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
      
      if (countResponse?.headers.get('X-WP-Total')) {
        totalProducts = parseInt(countResponse.headers.get('X-WP-Total') || '0');
        totalPages = parseInt(countResponse.headers.get('X-WP-TotalPages') || '1');
        console.log(`Total products to import: ${totalProducts} across ${totalPages} pages`);
      }
    } catch (countError) {
      console.log('Could not get total count, continuing with import');
    }

    // Update import log with total count
    await updateImportLog(supabase, importLogId, {
      total_products: totalProducts,
      total_pages: totalPages,
      progress_message: `Found ${totalProducts} products. Starting import...`
    });

    // Main import loop
    while (hasMorePages && consecutiveErrors < maxConsecutiveErrors) {
      try {
        console.log(`Processing page ${page}/${totalPages || '?'}`);
        
        // Check if import was stopped
        if (await isImportStopped(supabase, importLogId)) {
          console.log('Import was stopped by user');
          break;
        }

        // Fetch products with comprehensive fields
        const url = `${apiUrl}/products?page=${page}&per_page=${PRODUCTS_PER_PAGE}&status=publish&_fields=id,name,sku,price,regular_price,stock_quantity,manage_stock,stock_status,images,attributes,variations,date_modified,description,short_description,weight,dimensions,categories,tags`;
        console.log(`Fetching: ${url}`);
        
        const response = await fetchWithRetry(url, {
          method: 'GET',
          headers: baseHeaders,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response?.ok) {
          throw new Error(`HTTP ${response?.status}: Failed to fetch products`);
        }

        const products: WooCommerceProduct[] = await response.json();
        console.log(`Retrieved ${products.length} products from page ${page}`);

        // Update total pages if available
        const totalPagesHeader = response.headers.get('X-WP-TotalPages');
        if (totalPagesHeader && !totalPages) {
          totalPages = parseInt(totalPagesHeader);
        }

        // Check if we have more pages
        hasMorePages = products.length === PRODUCTS_PER_PAGE;

        if (products.length === 0) {
          console.log('No more products to process');
          break;
        }

        // Process products in batches
        const results = await processProductBatch(supabase, products, connection.id, apiUrl, baseHeaders);
        importedCount += results.successful;
        failedCount += results.failed;

        // Update progress
        await updateImportLog(supabase, importLogId, {
          current_page: page,
          total_pages: totalPages,
          imported_products: importedCount,
          failed_products: failedCount,
          progress_message: `Page ${page}/${totalPages}: Imported ${importedCount}, Failed ${failedCount}`
        });

        console.log(`Page ${page} completed: Imported ${results.successful}, Failed ${results.failed}`);
        
        // Reset consecutive errors on success
        consecutiveErrors = 0;
        page++;

        // Small delay between pages to prevent overloading
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (pageError) {
        consecutiveErrors++;
        console.error(`Error processing page ${page}:`, pageError);
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Too many consecutive errors (${consecutiveErrors}). Last error: ${pageError.message}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000 * consecutiveErrors));
        page++; // Move to next page even on error
      }
    }

    // Update connection stats
    await supabase
      .from('woocommerce_connections')
      .update({
        last_import_at: new Date().toISOString(),
        total_products_imported: importedCount
      })
      .eq('id', connection.id);

    // Mark import as completed
    await updateImportLog(supabase, importLogId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      imported_products: importedCount,
      failed_products: failedCount,
      progress_message: `Import completed successfully. Imported: ${importedCount}, Failed: ${failedCount}`
    });

    console.log(`Import completed! Imported: ${importedCount}, Failed: ${failedCount}`);

  } catch (error) {
    console.error('Import failed:', error);
    
    await updateImportLog(supabase, importLogId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: error.message,
      imported_products: importedCount,
      failed_products: failedCount,
      progress_message: `Import failed: ${error.message}`
    });
  }
}

// Process a batch of products
async function processProductBatch(supabase: any, products: WooCommerceProduct[], connectionId: string, apiUrl: string, headers: any) {
  let successful = 0;
  let failed = 0;

  for (const wcProduct of products) {
    try {
      console.log(`Processing product: ${wcProduct.name} (ID: ${wcProduct.id})`);

      // Check for existing product by WooCommerce ID or SKU
      let existingProduct = null;
      if (wcProduct.sku) {
        const { data: skuProduct } = await supabase
          .from('products')
          .select('id, woocommerce_id')
          .eq('sku', wcProduct.sku)
          .maybeSingle();
        existingProduct = skuProduct;
      }

      if (!existingProduct) {
        const { data: wcProduct2 } = await supabase
          .from('products')
          .select('id, sku')
          .eq('woocommerce_id', wcProduct.id)
          .eq('woocommerce_connection_id', connectionId)
          .maybeSingle();
        existingProduct = wcProduct2;
      }

      // Prepare product data
      const productData = {
        name: wcProduct.name,
        sku: wcProduct.sku || `wc_${wcProduct.id}`,
        rate: parseFloat(wcProduct.price) || parseFloat(wcProduct.regular_price) || 0,
        cost: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price) || 0,
        stock_quantity: wcProduct.manage_stock ? (wcProduct.stock_quantity || 0) : 999,
        low_stock_threshold: 10,
        image_url: wcProduct.images?.[0]?.src || null,
        has_variants: wcProduct.variations && wcProduct.variations.length > 0,
        woocommerce_id: wcProduct.id,
        woocommerce_connection_id: connectionId,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let productId: string;

      if (existingProduct) {
        // Update existing product
        const { data: updatedProduct, error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', existingProduct.id)
          .select('id')
          .single();

        if (updateError) {
          console.error(`Failed to update product ${wcProduct.name}:`, updateError);
          failed++;
          continue;
        }
        productId = updatedProduct.id;
        console.log(`Updated existing product: ${wcProduct.name}`);
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`Failed to create product ${wcProduct.name}:`, insertError);
          failed++;
          continue;
        }
        productId = newProduct.id;
        console.log(`Created new product: ${wcProduct.name}`);
      }

      // Import product attributes
      if (wcProduct.attributes && wcProduct.attributes.length > 0) {
        await importProductAttributes(supabase, wcProduct, productId);
      }

      // Import product variations
      if (wcProduct.variations && wcProduct.variations.length > 0) {
        await importProductVariations(supabase, wcProduct, productId, apiUrl, headers, connectionId);
      }

      successful++;

    } catch (productError) {
      console.error(`Error processing product ${wcProduct.name}:`, productError);
      failed++;
    }
  }

  return { successful, failed };
}

// Import product variations with comprehensive data
async function importProductVariations(supabase: any, wcProduct: WooCommerceProduct, productId: string, apiUrl: string, headers: any, connectionId?: string) {
  if (!wcProduct.variations || wcProduct.variations.length === 0) {
    return;
  }

  console.log(`Importing ${wcProduct.variations.length} variations for product ${wcProduct.name}`);
  
  let successCount = 0;
  let failedCount = 0;

  // Process variations in smaller batches
  const VARIATION_BATCH_SIZE = 3;
  
  for (let i = 0; i < wcProduct.variations.length; i += VARIATION_BATCH_SIZE) {
    const variationBatch = wcProduct.variations.slice(i, i + VARIATION_BATCH_SIZE);
    
    const variationPromises = variationBatch.map(async (variationId) => {
      try {
        const variationUrl = `${apiUrl}/products/${wcProduct.id}/variations/${variationId}?_fields=id,sku,price,regular_price,stock_quantity,manage_stock,stock_status,attributes,image,description,weight,dimensions`;
        console.log(`Fetching variation: ${variationUrl}`);
        
        const response = await fetchWithRetry(variationUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response?.ok) {
          throw new Error(`Failed to fetch variation ${variationId}`);
        }

        const variation: WooCommerceVariation = await response.json();
        console.log(`Successfully fetched variation ${variationId}`);

        // Create comprehensive variation data
        const variationData = {
          product_id: productId,
          sku: variation.sku || `${wcProduct.sku || `wc_${wcProduct.id}`}_${variation.id}`,
          rate: parseFloat(variation.price) || 0,
          cost: parseFloat(variation.regular_price) || parseFloat(variation.price) || 0,
          stock_quantity: variation.manage_stock ? (variation.stock_quantity || 0) : 999,
          low_stock_threshold: 10,
          image_url: variation.image ? variation.image.src : null,
          attributes: variation.attributes.reduce((acc: any, attr) => {
            // Clean up attribute names and values
            const cleanName = attr.name.replace(/^(pa_|attribute_)/, '').trim();
            const cleanValue = attr.option.trim();
            acc[cleanName] = cleanValue;
            return acc;
          }, {}),
          woocommerce_id: variation.id,
          woocommerce_connection_id: connectionId,
          last_synced_at: new Date().toISOString()
        };

        console.log(`Upserting variation data for ${variation.id}:`, JSON.stringify(variationData, null, 2));

        // Upsert variation
        const { error: upsertError } = await supabase
          .from('product_variants')
          .upsert(variationData, {
            onConflict: 'woocommerce_id,woocommerce_connection_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error(`Failed to upsert variation ${variation.id}:`, upsertError);
          throw upsertError;
        }

        console.log(`Successfully upserted variation ${variation.id}`);
        return { success: true };

      } catch (error) {
        console.error(`Error processing variation ${variationId}:`, error);
        return { success: false, error };
      }
    });

    const results = await Promise.allSettled(variationPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        failedCount++;
        console.error(`Variation ${variationBatch[index]} failed:`, result.status === 'rejected' ? result.reason : result.value.error);
      }
    });

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`Variations import for ${wcProduct.name}: ${successCount} success, ${failedCount} failed`);
}

// Import product attributes
async function importProductAttributes(supabase: any, wcProduct: WooCommerceProduct, productId: string) {
  const attributes = wcProduct.attributes?.filter(attr => attr.options && attr.options.length > 0) || [];
  
  if (attributes.length === 0) {
    return;
  }

  console.log(`Importing ${attributes.length} attributes for product ${wcProduct.name}`);

  for (const attr of attributes) {
    try {
      console.log(`Processing attribute: ${attr.name} with options:`, attr.options);

      // Upsert attribute
      const { data: attribute, error: attrError } = await supabase
        .from('product_attributes')
        .upsert({
          product_id: productId,
          name: attr.name
        }, {
          onConflict: 'product_id,name'
        })
        .select('id')
        .single();

      if (attrError) {
        console.error(`Failed to upsert attribute ${attr.name}:`, attrError);
        continue;
      }

      console.log(`Successfully upserted attribute ${attr.name} with ID: ${attribute.id}`);

      // Insert attribute values
      console.log(`Inserting ${attr.options.length} values for attribute ${attr.name}`);
      
      const valuePromises = attr.options.map(async (value) => {
        try {
          const { error: valueError } = await supabase
            .from('product_attribute_values')
            .upsert({
              attribute_id: attribute.id,
              value: value
            }, {
              onConflict: 'attribute_id,value'
            });

          if (valueError) {
            console.error(`Failed to insert value: ${value}`, valueError);
          } else {
            console.log(`Successfully inserted value: ${value} for attribute: ${attr.name}`);
          }
        } catch (error) {
          console.error(`Error inserting value ${value}:`, error);
        }
      });

      await Promise.allSettled(valuePromises);

    } catch (error) {
      console.error(`Error processing attribute ${attr.name}:`, error);
    }
  }

  console.log(`Successfully imported attributes for ${wcProduct.name}`);
}

// Fetch with retry mechanism
async function fetchWithRetry(url: string, options: any, retries = MAX_RETRIES): Promise<Response | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Fetching: ${url} (attempt ${attempt}/${retries})`);
      const response = await fetch(url, options);
      
      if (response.ok || response.status === 404) {
        console.log(`Successfully fetched ${url} (attempt ${attempt})`);
        return response;
      }
      
      if (attempt === retries) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`Attempt ${attempt} failed with status ${response.status}, retrying...`);
      
    } catch (error) {
      if (attempt === retries) {
        console.error(`All ${retries} attempts failed for ${url}:`, error);
        return null;
      }
      
      console.log(`Attempt ${attempt} failed:`, error.message, 'retrying...');
    }
    
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
  }
  
  return null;
}

// Update import log
async function updateImportLog(supabase: any, importLogId: string, updates: any) {
  try {
    const { error } = await supabase
      .from('woocommerce_import_logs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', importLogId);

    if (error) {
      console.error('Failed to update import log:', error);
    }
  } catch (error) {
    console.error('Error updating import log:', error);
  }
}

// Check if import was stopped
async function isImportStopped(supabase: any, importLogId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('woocommerce_import_logs')
      .select('status')
      .eq('id', importLogId)
      .single();

    if (error) {
      console.error('Error checking import status:', error);
      return false;
    }

    return data?.status === 'stopped';
  } catch (error) {
    console.error('Error checking if import stopped:', error);
    return false;
  }
}
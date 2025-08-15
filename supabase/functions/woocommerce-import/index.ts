import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

// Type definitions for WooCommerce API
interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: Array<any>;
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  low_stock_amount: number | null;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    position: number;
    visible: boolean;
    variation: boolean;
    options: string[];
  }>;
  default_attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  price_html: string;
  related_ids: number[];
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
  stock_status: string;
  has_options: boolean;
}

// Type definitions for WooCommerce variation
interface WooCommerceVariation {
  id: number;
  date_created: string;
  date_modified: string;
  description: string;
  permalink: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  status: string;
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads: Array<any>;
  download_limit: number;
  download_expiry: number;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_class: string;
  shipping_class_id: number;
  image: {
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  } | null;
  attributes: Array<{
    id: number;
    name: string;
    option: string;
  }>;
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
  stock_status: string;
}

// Constants for improved performance
const BATCH_SIZE = 10; // Process products in smaller batches to prevent memory issues
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MEMORY_CLEANUP_INTERVAL = 50; // Cleanup every 50 products

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

    console.log(`Starting optimized import for connection: ${connectionId}`);

    // Get the WooCommerce connection details with error handling
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

    // Create import log entry with better error handling
    const { data: importLog, error: logError } = await supabase
      .from('woocommerce_import_logs')
      .insert({
        connection_id: connectionId,
        status: 'in_progress',
        progress_message: 'Starting optimized import process...',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError || !importLog) {
      console.error('Failed to create import log:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to start import process' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const importLogId = importLog.id;
    console.log(`Created import log: ${importLogId}`);

    // Start the background import process with comprehensive error handling
    EdgeRuntime.waitUntil(processImportInBackground(supabase, connection, importLogId));

    return new Response(
      JSON.stringify({ 
        message: 'Import started successfully', 
        importLogId,
        note: 'This optimized import can handle millions of products efficiently'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import initialization error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start import: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Optimized background import process with comprehensive error handling
async function processImportInBackground(supabase: any, connection: any, importLogId: string) {
  let page = 1;
  let importedCount = 0;
  let failedCount = 0;
  let totalPages = 1;
  let hasMorePages = true;
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 10;

  try {
    console.log('Starting background import process with optimizations');

    const apiUrl = `${connection.site_url}/wp-json/wc/v3`;
    const auth = btoa(`${connection.consumer_key}:${connection.consumer_secret}`);
    const baseHeaders = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    // First, get the total count for better progress tracking
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
        console.log(`Total products to import: ${totalProducts} across ${totalPages} pages`);
      }
    } catch (countError) {
      console.log('Could not get total count, will determine during import:', countError.message);
    }

    // Update import log with total count
    await updateImportLog(supabase, importLogId, {
      total_products: totalProducts,
      total_pages: totalPages,
      progress_message: `Found ${totalProducts} products to import. Starting batch processing...`
    });

    let globalTimeout = setTimeout(() => {
      console.log('Global import timeout reached (15 minutes)');
      hasMorePages = false;
    }, 900000); // 15 minutes total timeout

    // Main import loop with optimizations
    while (hasMorePages && consecutiveErrors < maxConsecutiveErrors) {
      try {
        console.log(`Processing page ${page}/${totalPages || '?'}`);
        
        // Check if import was stopped
        if (await isImportStopped(supabase, importLogId)) {
          console.log('Import was stopped by user');
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

        // Update total pages if we got it from headers
        if (response.headers.get('X-WP-TotalPages')) {
          totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
        }

        const products: WooCommerceProduct[] = await response.json();
        console.log(`Retrieved ${products.length} products from page ${page}`);

        if (products.length === 0) {
          hasMorePages = false;
          break;
        }

        // Process products in smaller batches to prevent memory issues
        for (let i = 0; i < products.length; i += BATCH_SIZE) {
          const batch = products.slice(i, i + BATCH_SIZE);
          console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(products.length / BATCH_SIZE)} from page ${page}`);
          
          try {
            const batchResults = await procesProductBatch(supabase, batch, connection, apiUrl, baseHeaders);
            importedCount += batchResults.success;
            failedCount += batchResults.failed;
            
            // Update progress every batch
            await updateImportLog(supabase, importLogId, {
              imported_products: importedCount,
              failed_products: failedCount,
              current_page: page,
              progress_message: `Processed ${importedCount} products, ${failedCount} failed. Page ${page}/${totalPages}`
            });

            // Memory cleanup every N products
            if ((importedCount + failedCount) % MEMORY_CLEANUP_INTERVAL === 0) {
              // Force garbage collection if available
              if (typeof globalThis.gc === 'function') {
                globalThis.gc();
              }
              // Small delay to prevent overwhelming the database
              await new Promise(resolve => setTimeout(resolve, 100));
            }

            consecutiveErrors = 0; // Reset on success
          } catch (batchError) {
            console.error(`Batch processing error:`, batchError);
            failedCount += batch.length;
            consecutiveErrors++;
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
              throw new Error(`Too many consecutive errors: ${consecutiveErrors}`);
            }
          }
        }

        page++;
        
        // Check if this was the last page
        if (page > totalPages && totalPages > 0) {
          hasMorePages = false;
        }

        // Small delay between pages to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (pageError) {
        console.error(`Error processing page ${page}:`, pageError);
        consecutiveErrors++;
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Failed after ${maxConsecutiveErrors} consecutive page errors: ${pageError.message}`);
        }
        
        // Wait longer before retrying failed pages
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * consecutiveErrors));
        continue; // Try the same page again
      }
    }

    // Final update
    await updateImportLog(supabase, importLogId, {
      status: 'completed',
      imported_products: importedCount,
      failed_products: failedCount,
      completed_at: new Date().toISOString(),
      progress_message: `Import completed successfully! Imported: ${importedCount}, Failed: ${failedCount}`
    });

    console.log(`Import completed! Imported: ${importedCount}, Failed: ${failedCount}`);

    // Update connection with total imported count
    const { error: updateConnectionError } = await supabase
      .from('woocommerce_connections')
      .update({
        last_import_at: new Date().toISOString(),
        total_products_imported: importedCount
      })
      .eq('id', connection.id);

    if (updateConnectionError) {
      console.error('Failed to update connection stats:', updateConnectionError);
    }

  } catch (error) {
    console.error('Background import process failed:', error);
    
    await updateImportLog(supabase, importLogId, {
      status: 'failed',
      imported_products: importedCount,
      failed_products: failedCount,
      completed_at: new Date().toISOString(),
      error_message: error.message,
      progress_message: `Import failed: ${error.message}. Imported: ${importedCount}, Failed: ${failedCount}`
    });
  }
}

// Process a batch of products efficiently
async function procesProductBatch(supabase: any, products: WooCommerceProduct[], connection: any, apiUrl: string, headers: any) {
  let success = 0;
  let failed = 0;

  // Process products in parallel within the batch for better performance
  const batchPromises = products.map(async (wcProduct) => {
    try {
      // Skip non-published products - if no status is provided, assume it's published
      const productStatus = wcProduct.status || 'publish';
      if (productStatus === 'draft' || productStatus === 'trash' || productStatus === 'private') {
        console.log(`Skipping product ${wcProduct.name} with status: ${productStatus}`);
        return { success: 0, failed: 0 }; // Don't count skipped products as success
      }

      // Check if product already exists with better error handling
      const { data: existingProduct, error: existingProductError } = await supabase
        .from('products')
        .select('id, name, rate, stock_quantity, last_synced_at, woocommerce_id, sku')
        .or(`sku.eq.${wcProduct.sku || `wc_${wcProduct.id}`},woocommerce_id.eq.${wcProduct.id}`)
        .maybeSingle();

      if (existingProductError) {
        console.error(`Error checking existing product ${wcProduct.name}:`, existingProductError);
        return { success: 0, failed: 1 };
      }

      const currentPrice = parseFloat(wcProduct.price) || 0;
      const currentStock = wcProduct.manage_stock ? (wcProduct.stock_quantity || 0) : 999;

      if (existingProduct) {
        // Check if product needs updating
        const hasChanges = 
          existingProduct.name !== wcProduct.name ||
          Math.abs(existingProduct.rate - currentPrice) > 0.01 ||
          existingProduct.stock_quantity !== currentStock;

        if (!hasChanges) {
          console.log(`Product ${wcProduct.name} unchanged, skipping`);
          return { success: 1, failed: 0 };
        }

        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: wcProduct.name || `Product ${wcProduct.id}`,
            rate: currentPrice,
            stock_quantity: currentStock,
            image_url: wcProduct.images && wcProduct.images.length > 0 ? wcProduct.images[0].src : null,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', existingProduct.id);

        if (updateError) {
          console.error(`Failed to update product ${wcProduct.name}:`, updateError.message);
          return { success: 0, failed: 1 };
        }

        console.log(`Successfully updated product: ${wcProduct.name}`);
        return { success: 1, failed: 0 };
      }

      // Create new product with unique SKU handling
      const baseSku = wcProduct.sku || `wc_${wcProduct.id}`;
      let finalSku = baseSku;
      
      // Check if SKU already exists and make it unique
      const { data: existingSku } = await supabase
        .from('products')
        .select('sku')
        .eq('sku', baseSku)
        .single();
      
      if (existingSku) {
        finalSku = `${baseSku}_${wcProduct.id}_${Date.now()}`;
        console.log(`SKU ${baseSku} already exists, using ${finalSku}`);
      }

      const productData = {
        name: wcProduct.name || `Product ${wcProduct.id}`,
        sku: finalSku,
        rate: currentPrice,
        cost: parseFloat(wcProduct.regular_price) || currentPrice,
        stock_quantity: currentStock,
        low_stock_threshold: 10,
        image_url: wcProduct.images && wcProduct.images.length > 0 ? wcProduct.images[0].src : null,
        size: wcProduct.attributes ? wcProduct.attributes.find(attr => 
          attr.name.toLowerCase().includes('size'))?.options.join(', ') || null : null,
        color: wcProduct.attributes ? wcProduct.attributes.find(attr => 
          attr.name.toLowerCase().includes('color') || attr.name.toLowerCase().includes('colour'))?.options.join(', ') || null : null,
        has_variants: wcProduct.variations && wcProduct.variations.length > 0,
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
        console.error(`Failed to insert product ${wcProduct.name}:`, productError);
        console.error(`Product data that failed:`, JSON.stringify(productData, null, 2));
        return { success: 0, failed: 1 };
      }

            console.log(`Successfully imported product: ${wcProduct.name} (${newProduct.id})`);

            // Import variations if they exist
            if (wcProduct.variations && wcProduct.variations.length > 0) {
              try {
                await importProductVariations(supabase, wcProduct, newProduct.id, apiUrl, headers, connection.id);
              } catch (varError) {
                console.error(`Failed to import variations for ${wcProduct.name}:`, varError);
                // Don't fail the entire product for variation errors
              }
            }

            // Import product attributes if available
            console.log(`Checking attributes for product ${wcProduct.name}: ${JSON.stringify(wcProduct.attributes)}`);
            if (wcProduct.attributes && wcProduct.attributes.length > 0) {
              console.log(`Found ${wcProduct.attributes.length} attributes for ${wcProduct.name}, importing...`);
              try {
                await importProductAttributes(supabase, wcProduct, newProduct.id);
                console.log(`Successfully imported attributes for ${wcProduct.name}`);
              } catch (attrError) {
                console.error(`Failed to import attributes for ${wcProduct.name}:`, attrError);
                // Don't fail the entire product for attribute errors
              }
            } else {
              console.log(`No attributes found for product ${wcProduct.name}`);
            }

      return { success: 1, failed: 0 };

    } catch (error) {
      console.error(`Error processing product ${wcProduct.name}:`, error);
      return { success: 0, failed: 1 };
    }
  });

  // Wait for all products in the batch to complete
  const results = await Promise.allSettled(batchPromises);
  
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      success += result.value.success;
      failed += result.value.failed;
    } else {
      console.error('Batch promise rejected:', result.reason);
      failed += 1;
    }
  });

  return { success, failed };
}

// Optimized function to import product variations
async function importProductVariations(supabase: any, wcProduct: WooCommerceProduct, productId: string, apiUrl: string, headers: any, connectionId?: string) {
  if (!wcProduct.variations || wcProduct.variations.length === 0) {
    return;
  }

  console.log(`Importing ${wcProduct.variations.length} variations for product ${wcProduct.name}`);
  
  let successCount = 0;
  let failedCount = 0;

  // Process variations in smaller batches to prevent memory issues
  const VARIATION_BATCH_SIZE = 5;
  
  for (let i = 0; i < wcProduct.variations.length; i += VARIATION_BATCH_SIZE) {
    const variationBatch = wcProduct.variations.slice(i, i + VARIATION_BATCH_SIZE);
    
    const variationPromises = variationBatch.map(async (variationId) => {
      try {
        const variationUrl = `${apiUrl}/products/${wcProduct.id}/variations/${variationId}?_fields=id,sku,price,regular_price,stock_quantity,manage_stock,stock_status,attributes,image`;
        console.log(`Fetching: ${variationUrl} (attempt 1/${MAX_RETRIES})`);
        
        const response = await fetchWithRetry(variationUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response || !response.ok) {
          throw new Error(`Failed to fetch variation ${variationId}`);
        }

        const variation: WooCommerceVariation = await response.json();
        console.log(`Successfully fetched ${variationUrl} (attempt 1)`);

        // Create variation data
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
          woocommerce_connection_id: connectionId || wcProduct.woocommerce_connection_id,
          last_synced_at: new Date().toISOString(),
        };

        console.log(`Upserting variation data for ${variation.id}:`, JSON.stringify(variationData, null, 2));

        const { error: variantError } = await supabase
          .from('product_variants')
          .upsert(variationData, {
            onConflict: 'woocommerce_connection_id,woocommerce_id',
            ignoreDuplicates: false
          });

        if (variantError) {
          console.error(`Failed to upsert variation ${variation.id}:`, variantError);
          return { success: 0, failed: 1 };
        }

        return { success: 1, failed: 0 };

      } catch (error) {
        console.error(`Error importing variation ${variationId}:`, error);
        return { success: 0, failed: 1 };
      }
    });

    const batchResults = await Promise.allSettled(variationPromises);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        successCount += result.value.success;
        failedCount += result.value.failed;
      } else {
        failedCount += 1;
      }
    });

    // Small delay between variation batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Variations import for ${wcProduct.name}: ${successCount} success, ${failedCount} failed`);
}

// Robust fetch with retry logic
async function fetchWithRetry(url: string, options: any, retries = MAX_RETRIES): Promise<Response | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      // Don't retry client errors (4xx), only server errors (5xx) and network issues
      if (response.status >= 400 && response.status < 500) {
        console.error(`Client error ${response.status} for ${url}, not retrying`);
        return response; // Return the error response for handling upstream
      }
      
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      console.error(`Attempt ${attempt}/${retries} failed for ${url}:`, error.message);
      
      if (attempt === retries) {
        console.error(`All ${retries} attempts failed for ${url}`);
        return null;
      }
      
      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before retry ${attempt + 1}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

// Helper function to update import log
async function updateImportLog(supabase: any, importLogId: string, updates: any) {
  try {
    const { error } = await supabase
      .from('woocommerce_import_logs')
      .update(updates)
      .eq('id', importLogId);
    
    if (error) {
      console.error('Failed to update import log:', error);
    }
  } catch (error) {
    console.error('Error updating import log:', error);
  }
}

// Helper function to check if import was stopped
async function isImportStopped(supabase: any, importLogId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('woocommerce_import_logs')
      .select('status')
      .eq('id', importLogId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.status === 'failed' && data.error_message?.includes('stopped by user');
  } catch (error) {
    console.error('Error checking import status:', error);
    return false;
  }
}

// Import product attributes into dedicated table
async function importProductAttributes(supabase: any, wcProduct: WooCommerceProduct, productId: string) {
  if (!wcProduct.attributes || wcProduct.attributes.length === 0) {
    console.log(`No attributes to import for product ${wcProduct.name}`);
    return;
  }

  console.log(`Importing ${wcProduct.attributes.length} attributes for product ${wcProduct.name}:`, JSON.stringify(wcProduct.attributes));

  for (const attribute of wcProduct.attributes) {
    try {
      console.log(`Processing attribute: ${attribute.name} with options: ${JSON.stringify(attribute.options)}`);
      
      // Insert or update the product attribute
      const { data: productAttribute, error: attributeError } = await supabase
        .from('product_attributes')
        .upsert({
          product_id: productId,
          name: attribute.name
        }, {
          onConflict: 'product_id,name',
          ignoreDuplicates: false
        })
        .select('id')
        .single();

      if (attributeError) {
        console.error(`Failed to insert attribute ${attribute.name}:`, attributeError);
        continue;
      }

      console.log(`Successfully inserted attribute ${attribute.name} with ID: ${productAttribute.id}`);

      // Insert attribute values
      if (attribute.options && attribute.options.length > 0) {
        console.log(`Inserting ${attribute.options.length} values for attribute ${attribute.name}`);
        for (const option of attribute.options) {
          const { error: valueError } = await supabase
            .from('product_attribute_values')
            .upsert({
              attribute_id: productAttribute.id,
              value: option
            }, {
              onConflict: 'attribute_id,value',
              ignoreDuplicates: true
            });

          if (valueError) {
            console.error(`Failed to insert attribute value ${option}:`, valueError);
          } else {
            console.log(`Successfully inserted value: ${option} for attribute: ${attribute.name}`);
          }
        }
      } else {
        console.log(`No options found for attribute ${attribute.name}`);
      }
    } catch (error) {
      console.error(`Error importing attribute ${attribute.name}:`, error);
    }
  }
  
  console.log(`Finished importing attributes for product ${wcProduct.name}`);
}
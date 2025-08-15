import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
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
  related_ids: number[];
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
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

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
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
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
  };
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
}

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

    // Get the WooCommerce connection details
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

    // Create import log entry
    const { data: importLog, error: logError } = await supabase
      .from('woocommerce_import_logs')
      .insert({
        connection_id: connectionId,
        status: 'pending',
        total_products: 0,
        imported_products: 0,
        failed_products: 0,
      })
      .select()
      .single();

    if (logError || !importLog) {
      console.error('Log creation error:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to create import log' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start the background import process
    EdgeRuntime.waitUntil(importProducts(connection, importLog.id));
    
    // Return immediately
    return new Response(
      JSON.stringify({ 
        message: 'Import started successfully',
        importLogId: importLog.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function importProducts(connection: any, importLogId: string) {
  try {
    console.log(`Starting import for connection ${connection.id}, log ${importLogId}`);
    
    // Update status to in_progress
    await supabase
      .from('woocommerce_import_logs')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString(),
        progress_message: 'Initializing import...'
      })
      .eq('id', importLogId);

    const baseUrl = connection.site_url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/wp-json/wc/v3`;
    
    const auth = btoa(`${connection.consumer_key}:${connection.consumer_secret}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    // Get or resume import progress
    let { data: importLog } = await supabase
      .from('woocommerce_import_logs')
      .select('*')
      .eq('id', importLogId)
      .single();

    let currentPage = (importLog?.current_page || 0) + 1;
    let totalPages = importLog?.total_pages || 0;
    let totalProducts = importLog?.total_products || 0;
    let importedCount = importLog?.imported_products || 0;
    let failedCount = importLog?.failed_products || 0;

    // If this is a fresh start or we don't have pagination info, fetch it
    if (currentPage === 1 || totalPages === 0) {
      console.log('Fetching pagination info...');
      
      const totalResponse = await fetchWithRetry(
        `${apiUrl}/products?per_page=1&status=publish&_fields=id`, 
        { headers },
        5 // More retries for initial request
      );
      
      if (!totalResponse.ok) {
        throw new Error(`Failed to fetch product count: ${totalResponse.status} ${totalResponse.statusText}`);
      }
      
      totalPages = parseInt(totalResponse.headers.get('X-WP-TotalPages') || '1');
      totalProducts = parseInt(totalResponse.headers.get('X-WP-Total') || '0');

      console.log(`Found ${totalProducts} published products across ${totalPages} pages`);

      // Update log with pagination info
      await supabase
        .from('woocommerce_import_logs')
        .update({ 
          total_products: totalProducts,
          total_pages: totalPages,
          progress_message: `Found ${totalProducts} products to import`
        })
        .eq('id', importLogId);
    }

    // Import products page by page with proper progress tracking
    for (let page = currentPage; page <= totalPages; page++) {
      console.log(`Processing page ${page} of ${totalPages} (${Math.round((page/totalPages)*100)}% complete)`);
      
      // Check if import should be stopped
      const { data: importStatus } = await supabase
        .from('woocommerce_import_logs')
        .select('status')
        .eq('id', importLogId)
        .single();

      if (importStatus?.status === 'stopping' || importStatus?.status === 'stopped') {
        console.log('Import stopped by user');
        await supabase
          .from('woocommerce_import_logs')
          .update({ 
            status: 'stopped',
            completed_at: new Date().toISOString(),
            progress_message: `Import stopped at page ${page} of ${totalPages}`
          })
          .eq('id', importLogId);
        return;
      }

      // Update current page progress
      await supabase
        .from('woocommerce_import_logs')
        .update({ 
          current_page: page,
          progress_message: `Processing page ${page} of ${totalPages} (${Math.round((page/totalPages)*100)}% complete)`
        })
        .eq('id', importLogId);

      try {
        // Fetch products for this page with comprehensive error handling
        const response = await fetchWithRetry(
          `${apiUrl}/products?per_page=100&page=${page}&status=publish&_fields=id,name,slug,type,status,sku,price,regular_price,sale_price,stock_quantity,manage_stock,stock_status,images,categories,tags,attributes,variations,weight,dimensions`,
          { headers },
          5 // More retries per page
        );

        if (!response.ok) {
          const errorMsg = `Failed to fetch page ${page}: ${response.status} ${response.statusText}`;
          console.error(errorMsg);
          
          // Log the failed page but continue with next page
          await supabase
            .from('woocommerce_import_logs')
            .update({ 
              error_message: errorMsg,
              progress_message: `Error on page ${page}, continuing...`
            })
            .eq('id', importLogId);
            
          failedCount += 100; // Estimate failed products for this page
          continue;
        }

        const products: WooCommerceProduct[] = await response.json();
        console.log(`Retrieved ${products.length} products from page ${page}`);

        // Process each product with individual error handling
        for (let i = 0; i < products.length; i++) {
          const wcProduct = products[i];
          
          try {
            // Skip non-published products (additional safety check)
            if (wcProduct.status !== 'publish') {
              console.log(`Skipping product ${wcProduct.name} with status: ${wcProduct.status}`);
              continue;
            }

            // Check if product already exists and compare for changes
            console.log(`Checking for existing product with SKU: ${wcProduct.sku || `wc_${wcProduct.id}`} or WooCommerce ID: ${wcProduct.id}`);
            const { data: existingProduct, error: existingProductError } = await supabase
              .from('products')
              .select('id, name, rate, stock_quantity, last_synced_at, woocommerce_id, sku')
              .or(`sku.eq.${wcProduct.sku || `wc_${wcProduct.id}`},woocommerce_id.eq.${wcProduct.id}`)
              .maybeSingle();

            if (existingProductError) {
              console.error(`Error checking existing product:`, existingProductError);
              failedCount++;
              continue;
            }

            if (existingProduct) {
              // Check if product needs updating
              const currentPrice = parseFloat(wcProduct.price) || 0;
              const currentStock = wcProduct.manage_stock ? (wcProduct.stock_quantity || 0) : 999;
              
              const hasChanges = 
                existingProduct.name !== wcProduct.name ||
                Math.abs(existingProduct.rate - currentPrice) > 0.01 ||
                existingProduct.stock_quantity !== currentStock;

              if (!hasChanges) {
                console.log(`Product ${wcProduct.name} unchanged, skipping`);
                importedCount++; // Count as processed
                continue;
              }

              // Update existing product with changes
              console.log(`Updating product ${wcProduct.name} with changes`);
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
                failedCount++;
              } else {
                importedCount++;
                console.log(`Successfully updated product: ${wcProduct.name}`);
              }
              continue;
            }

            // Map WooCommerce product to our schema
            const productData = {
              name: wcProduct.name || `Product ${wcProduct.id}`,
              sku: wcProduct.sku || `wc_${wcProduct.id}`,
              rate: parseFloat(wcProduct.price) || 0,
              cost: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price) || 0,
              stock_quantity: wcProduct.manage_stock ? (wcProduct.stock_quantity || 0) : 999,
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

            // Insert the product with retry logic
            const { data: newProduct, error: productError } = await supabase
              .from('products')
              .insert(productData)
              .select('id')
              .single();

            if (productError) {
              console.error(`Failed to insert product ${wcProduct.name}:`, productError.message);
              failedCount++;
              continue;
            }

            // Import variations if they exist
            if (wcProduct.variations && wcProduct.variations.length > 0) {
              const variationsImported = await importProductVariations(
                wcProduct, 
                newProduct.id, 
                apiUrl, 
                headers,
                connection.id
              );
              if (!variationsImported) {
                console.warn(`Some variations failed for product ${wcProduct.name}`);
              }
            }

            importedCount++;
            console.log(`Successfully imported product: ${wcProduct.name} (${importedCount}/${totalProducts})`);

          } catch (productError) {
            console.error(`Error processing product ${wcProduct.name}:`, productError);
            failedCount++;
          }

          // Update progress every 10 products for better UX
          if ((importedCount + failedCount) % 10 === 0) {
            await supabase
              .from('woocommerce_import_logs')
              .update({ 
                imported_products: importedCount,
                failed_products: failedCount,
                progress_message: `Imported ${importedCount} of ${totalProducts} products (${failedCount} failed)`
              })
              .eq('id', importLogId);
          }

          // Micro delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Update progress after each page
        await supabase
          .from('woocommerce_import_logs')
          .update({ 
            imported_products: importedCount,
            failed_products: failedCount,
            current_page: page,
            progress_message: `Completed page ${page} of ${totalPages}. Imported: ${importedCount}, Failed: ${failedCount}`
          })
          .eq('id', importLogId);

        console.log(`Completed page ${page}. Total imported: ${importedCount}, failed: ${failedCount}`);

      } catch (pageError) {
        console.error(`Critical error processing page ${page}:`, pageError);
        
        // Log the error but continue with next page
        await supabase
          .from('woocommerce_import_logs')
          .update({ 
            error_message: `Page ${page} error: ${pageError.message}`,
            progress_message: `Error on page ${page}, continuing with next page...`
          })
          .eq('id', importLogId);
          
        // Add estimated failures for this page
        failedCount += 100;
      }

      // Inter-page delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update connection stats
    await supabase
      .from('woocommerce_connections')
      .update({
        last_import_at: new Date().toISOString(),
        total_products_imported: importedCount,
      })
      .eq('id', connection.id);

    // Final progress update to ensure 100% completion
    await supabase
      .from('woocommerce_import_logs')
      .update({
        imported_products: importedCount,
        failed_products: failedCount,
        current_page: totalPages,
        progress_message: `Finalizing import... Processed: ${importedCount + failedCount}/${totalProducts}`
      })
      .eq('id', importLogId);

    // Mark import as completed with final status
    await supabase
      .from('woocommerce_import_logs')
      .update({
        status: 'completed',
        imported_products: importedCount,
        failed_products: failedCount,
        completed_at: new Date().toISOString(),
        progress_message: `Import Complete! Successfully processed ${importedCount} products${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
        current_page: totalPages
      })
      .eq('id', importLogId);

    console.log(`Import completed successfully: ${importedCount} imported, ${failedCount} failed out of ${totalProducts} total`);

  } catch (error) {
    console.error('Critical import process failure:', error);
    
    // Mark import as failed with detailed error
    await supabase
      .from('woocommerce_import_logs')
      .update({
        status: 'failed',
        error_message: `Critical failure: ${error.message}`,
        completed_at: new Date().toISOString(),
        progress_message: 'Import failed due to critical error'
      })
      .eq('id', importLogId);
      
    throw error; // Re-throw to ensure it's logged properly
  }
}

// Enhanced retry logic with exponential backoff and comprehensive error handling
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching: ${url} (attempt ${attempt}/${maxRetries})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle rate limiting with proper retry after
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        const waitTime = Math.min(retryAfter, 300); // Cap at 5 minutes
        console.log(`Rate limited, waiting ${waitTime} seconds before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }
      
      // Handle server errors (5xx) with retry
      if (response.status >= 500) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Server error ${response.status}, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // For client errors (4xx), don't retry except for 429
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`Client error ${response.status}: ${response.statusText}`);
        return response; // Return the error response to handle upstream
      }
      
      // Success or acceptable response
      if (response.ok || response.status < 400) {
        console.log(`Successfully fetched ${url} (attempt ${attempt})`);
        return response;
      }
      
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.error(`Max retries exceeded for ${url}`);
        throw new Error(`Request failed after ${maxRetries} attempts: ${lastError.message}`);
      }
      
      // Exponential backoff with jitter
      const baseDelay = Math.pow(2, attempt) * 1000;
      const jitter = Math.random() * 1000;
      const delay = baseDelay + jitter;
      
      console.log(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Max retries exceeded: ${lastError?.message || 'Unknown error'}`);
}

// Enhanced variation import with better error handling
async function importProductVariations(
  wcProduct: WooCommerceProduct, 
  productId: string, 
  apiUrl: string, 
  headers: Record<string, string>,
  connectionId: string
): Promise<boolean> {
  let successCount = 0;
  let failCount = 0;
  
  try {
    console.log(`Importing ${wcProduct.variations.length} variations for product ${wcProduct.name}`);
    
    for (const variationId of wcProduct.variations) {
      try {
        const response = await fetchWithRetry(
          `${apiUrl}/products/${wcProduct.id}/variations/${variationId}?_fields=id,sku,price,regular_price,stock_quantity,manage_stock,stock_status,attributes,image`, 
          { headers },
          3 // Fewer retries for variations to not slow down too much
        );
        
        if (!response.ok) {
          console.error(`Failed to fetch variation ${variationId}: ${response.status}`);
          failCount++;
          continue;
        }

        const variation: WooCommerceVariation = await response.json();

        // Map variation attributes to our JSONB format
        const attributes: Record<string, string> = {};
        if (variation.attributes) {
          variation.attributes.forEach(attr => {
            attributes[attr.name] = attr.option;
          });
        }

        const variantData = {
          product_id: productId,
          attributes,
          sku: variation.sku || `wc_var_${variation.id}`,
          rate: parseFloat(variation.price) || 0,
          cost: parseFloat(variation.regular_price) || parseFloat(variation.price) || 0,
          stock_quantity: variation.manage_stock ? (variation.stock_quantity || 0) : 999,
          image_url: variation.image?.src || null,
          woocommerce_id: variation.id,
          woocommerce_connection_id: connectionId,
          last_synced_at: new Date().toISOString(),
        };

        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (variantError) {
          console.error(`Failed to insert variant ${variation.id} for product ${wcProduct.name}:`, variantError.message);
          failCount++;
        } else {
          successCount++;
        }
        
        // Small delay between variation imports
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (varError) {
        console.error(`Error processing variation ${variationId}:`, varError);
        failCount++;
      }
    }
    
    console.log(`Variations import for ${wcProduct.name}: ${successCount} success, ${failCount} failed`);
    return failCount === 0; // Return true only if all variations succeeded
    
  } catch (error) {
    console.error(`Critical error importing variations for product ${wcProduct.name}:`, error);
    return false;
  }
}
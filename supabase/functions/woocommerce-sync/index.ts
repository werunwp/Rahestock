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
    const { connectionId, syncType = 'manual' } = await req.json();

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

    // Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('woocommerce_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        status: 'pending',
      })
      .select()
      .single();

    if (logError || !syncLog) {
      console.error('Log creation error:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to create sync log' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start the background sync process
    EdgeRuntime.waitUntil(syncProducts(connection, syncLog.id));
    
    // Return immediately
    return new Response(
      JSON.stringify({ 
        message: 'Sync started successfully',
        syncLogId: syncLog.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncProducts(connection: any, syncLogId: string) {
  let productsUpdated = 0;
  let productsCreated = 0;
  let productsFailed = 0;
  let processedCount = 0;

  try {
    // Update status to in_progress
    await supabase
      .from('woocommerce_sync_logs')
      .update({ status: 'in_progress' })
      .eq('id', syncLogId);

    const baseUrl = connection.site_url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/wp-json/wc/v3`;
    
    const auth = btoa(`${connection.consumer_key}:${connection.consumer_secret}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    // Get total number of published products
    const totalResponse = await fetchWithRetry(`${apiUrl}/products?per_page=1&status=publish`, { headers });
    if (!totalResponse.ok) {
      throw new Error(`Failed to fetch product count: ${totalResponse.statusText}`);
    }
    
    const totalPages = parseInt(totalResponse.headers.get('X-WP-TotalPages') || '1');
    const totalProducts = parseInt(totalResponse.headers.get('X-WP-Total') || '0');

    console.log(`Starting two-way sync for connection ${connection.site_name}`);
    console.log(`Total products to sync: ${totalProducts} across ${totalPages} pages`);

    // Sync from WooCommerce to local database
    for (let page = 1; page <= totalPages; page++) {
      // Check if sync should be stopped
      const { data: syncStatus } = await supabase
        .from('woocommerce_sync_logs')
        .select('status')
        .eq('id', syncLogId)
        .single();

      if (syncStatus?.status === 'stopping' || syncStatus?.status === 'stopped') {
        console.log('Sync stopped by user');
        break;
      }

      console.log(`Processing page ${page} of ${totalPages}`);

      const response = await fetchWithRetry(`${apiUrl}/products?per_page=100&page=${page}&status=publish`, { headers });
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.statusText}`);
        continue;
      }

      const wcProducts: WooCommerceProduct[] = await response.json();

      for (const wcProduct of wcProducts) {
        try {
          processedCount++;

          // Skip if not published
          if (wcProduct.status !== 'publish') {
            console.log(`Skipping product ${wcProduct.name} with status: ${wcProduct.status}`);
            continue;
          }

          // Check if product exists in local database
          const { data: existingProduct } = await supabase
            .from('products')
            .select('*')
            .eq('woocommerce_id', wcProduct.id)
            .eq('woocommerce_connection_id', connection.id)
            .single();

          if (existingProduct) {
            // Check if product needs updating
            const wcModified = new Date(wcProduct.date_modified);
            const localModified = new Date(existingProduct.last_synced_at || existingProduct.updated_at);
            
            if (wcModified > localModified) {
              // Update existing product with comprehensive data
              const updateData = {
                name: wcProduct.name,
                sku: wcProduct.sku || existingProduct.sku,
                rate: parseFloat(wcProduct.price) || 0,
                cost: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price) || 0,
                stock_quantity: wcProduct.stock_quantity || 0,
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
                productsFailed++;
              } else {
                productsUpdated++;

                // Update/sync product variants if they exist
                if (wcProduct.variations.length > 0) {
                  await syncProductVariations(wcProduct, existingProduct.id, apiUrl, headers);
                }
              }
            }
          } else {
            // Create new product with all details
            const productData = {
              name: wcProduct.name,
              sku: wcProduct.sku || `wc_${wcProduct.id}`,
              rate: parseFloat(wcProduct.price) || 0,
              cost: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price) || 0,
              stock_quantity: wcProduct.stock_quantity || 0,
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

            const { data: newProduct, error: insertError } = await supabase
              .from('products')
              .insert(productData)
              .select()
              .single();

            if (insertError) {
              console.error(`Failed to create product ${wcProduct.name}:`, insertError);
              productsFailed++;
            } else {
              productsCreated++;

              // Import product variations if they exist
              if (wcProduct.variations.length > 0 && newProduct) {
                await syncProductVariations(wcProduct, newProduct.id, apiUrl, headers);
              }
            }
          }

          // Update progress every 5 products
          if (processedCount % 5 === 0) {
            await supabase
              .from('woocommerce_sync_logs')
              .update({
                products_created: productsCreated,
                products_updated: productsUpdated,
                products_failed: productsFailed,
              })
              .eq('id', syncLogId);
          }

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error syncing product ${wcProduct.name}:`, error);
          productsFailed++;
        }
      }

      // Delay between pages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Sync from local database to WooCommerce (products modified locally)
    const { data: localProducts } = await supabase
      .from('products')
      .select('*')
      .eq('woocommerce_connection_id', connection.id)
      .not('woocommerce_id', 'is', null)
      .gt('updated_at', 'last_synced_at')
      .order('updated_at', { ascending: true })
      .limit(50); // Limit to avoid overwhelming WooCommerce

    if (localProducts) {
      for (const localProduct of localProducts) {
        try {
          const updatePayload = {
            name: localProduct.name,
            regular_price: localProduct.cost?.toString() || '0',
            price: localProduct.rate?.toString() || '0',
            stock_quantity: localProduct.stock_quantity || 0,
          };

          const updateResponse = await fetchWithRetry(
            `${apiUrl}/products/${localProduct.woocommerce_id}`,
            {
              method: 'PUT',
              headers,
              body: JSON.stringify(updatePayload),
            }
          );

          if (updateResponse.ok) {
            // Update last_synced_at
            await supabase
              .from('products')
              .update({ last_synced_at: new Date().toISOString() })
              .eq('id', localProduct.id);
            
            console.log(`Updated WooCommerce product: ${localProduct.name}`);
          } else {
            console.error(`Failed to update WooCommerce product ${localProduct.name}: ${updateResponse.statusText}`);
            productsFailed++;
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error updating WooCommerce product ${localProduct.name}:`, error);
          productsFailed++;
        }
      }
    }

    // Update connection stats
    await supabase
      .from('woocommerce_connections')
      .update({
        last_import_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    // Mark sync as completed
    await supabase
      .from('woocommerce_sync_logs')
      .update({
        status: 'completed',
        products_created: productsCreated,
        products_updated: productsUpdated,
        products_failed: productsFailed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId);

    console.log(`Sync completed: ${productsCreated} created, ${productsUpdated} updated, ${productsFailed} failed`);

  } catch (error) {
    console.error('Sync process failed:', error);
    
    // Mark sync as failed
    await supabase
      .from('woocommerce_sync_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        products_created: productsCreated,
        products_updated: productsUpdated,
        products_failed: productsFailed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId);
  }
}

// Retry logic with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If rate limited, wait and retry
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '30');
        console.log(`Rate limited, waiting ${retryAfter} seconds before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 2^attempt seconds
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

async function syncProductVariations(
  wcProduct: WooCommerceProduct, 
  productId: string, 
  apiUrl: string, 
  headers: Record<string, string>
) {
  try {
    for (const variationId of wcProduct.variations) {
      const response = await fetchWithRetry(
        `${apiUrl}/products/${wcProduct.id}/variations/${variationId}`, 
        { headers }
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch variation ${variationId}`);
        continue;
      }

      const variation: WooCommerceVariation = await response.json();

      // Check if variation already exists
      const { data: existingVariant } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .eq('woocommerce_id', variation.id)
        .single();

      // Map variation attributes to our JSONB format
      const attributes: Record<string, string> = {};
      variation.attributes.forEach(attr => {
        attributes[attr.name] = attr.option;
      });

      const variantData = {
        product_id: productId,
        attributes,
        sku: variation.sku || `wc_var_${variation.id}`,
        rate: parseFloat(variation.price) || 0,
        cost: parseFloat(variation.regular_price) || parseFloat(variation.price) || 0,
        stock_quantity: variation.stock_quantity || 0,
        image_url: variation.image?.src || null,
        woocommerce_id: variation.id,
        last_synced_at: new Date().toISOString(),
      };

      if (existingVariant) {
        // Update existing variant
        const { error: variantError } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', existingVariant.id);

        if (variantError) {
          console.error(`Failed to update variant for product ${wcProduct.name}:`, variantError);
        }
      } else {
        // Create new variant
        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantData);

        if (variantError) {
          console.error(`Failed to insert variant for product ${wcProduct.name}:`, variantError);
        }
      }
      
      // Small delay between variation imports
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } catch (error) {
    console.error(`Error syncing variations for product ${wcProduct.name}:`, error);
  }
}
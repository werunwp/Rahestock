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
    const importPromise = importProducts(connection, importLog.id);
    
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
    // Update status to in_progress
    await supabase
      .from('woocommerce_import_logs')
      .update({ status: 'in_progress' })
      .eq('id', importLogId);

    const baseUrl = connection.site_url.replace(/\/$/, '');
    const apiUrl = `${baseUrl}/wp-json/wc/v3`;
    
    const auth = btoa(`${connection.consumer_key}:${connection.consumer_secret}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    // First, get total number of published products only
    const totalResponse = await fetchWithRetry(`${apiUrl}/products?per_page=1&status=publish`, { headers });
    if (!totalResponse.ok) {
      throw new Error(`Failed to fetch product count: ${totalResponse.statusText}`);
    }
    
    const totalPages = parseInt(totalResponse.headers.get('X-WP-TotalPages') || '1');
    const totalProducts = parseInt(totalResponse.headers.get('X-WP-Total') || '0');

    console.log(`Total products to import: ${totalProducts} across ${totalPages} pages`);

    // Update log with total
    await supabase
      .from('woocommerce_import_logs')
      .update({ total_products: totalProducts })
      .eq('id', importLogId);

    let importedCount = 0;
    let failedCount = 0;
    let processedCount = 0;

    // Import products page by page
    for (let page = 1; page <= totalPages; page++) {
      console.log(`Processing page ${page} of ${totalPages}`);
      
      const response = await fetchWithRetry(`${apiUrl}/products?per_page=100&page=${page}&status=publish`, { headers });
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.statusText}`);
        failedCount += 100; // Assume failure for all products on this page
        continue;
      }

      const products: WooCommerceProduct[] = await response.json();

      for (const wcProduct of products) {
        try {
          processedCount++;
          
          // Skip draft or trashed products
          if (wcProduct.status !== 'publish') {
            console.log(`Skipping product ${wcProduct.name} with status: ${wcProduct.status}`);
            continue;
          }

          // Check if product already exists (by SKU or WooCommerce ID)
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .or(`sku.eq.${wcProduct.sku || `wc_${wcProduct.id}`},woocommerce_id.eq.${wcProduct.id}`)
            .single();

          if (existingProduct) {
            console.log(`Product ${wcProduct.name} already exists, skipping`);
            continue;
          }

          // Map WooCommerce product to our schema
          const productData = {
            name: wcProduct.name,
            sku: wcProduct.sku || `wc_${wcProduct.id}`,
            rate: parseFloat(wcProduct.price) || 0,
            cost: parseFloat(wcProduct.regular_price) || parseFloat(wcProduct.price) || 0,
            stock_quantity: wcProduct.stock_quantity || 0,
            low_stock_threshold: 10,
            image_url: wcProduct.images.length > 0 ? wcProduct.images[0].src : null,
            has_variants: wcProduct.variations.length > 0,
            created_by: connection.user_id,
            woocommerce_id: wcProduct.id,
            woocommerce_connection_id: connection.id,
          };

          // Insert the product
          const { data: newProduct, error: productError } = await supabase
            .from('products')
            .insert(productData)
            .select()
            .single();

          if (productError) {
            console.error(`Failed to insert product ${wcProduct.name}:`, productError);
            failedCount++;
            continue;
          }

          // If product has variations, import them
          if (wcProduct.variations.length > 0) {
            await importProductVariations(wcProduct, newProduct.id, apiUrl, headers);
          }

          importedCount++;
          
          // Update progress more frequently for better UX
          if (processedCount % 5 === 0) {
            await supabase
              .from('woocommerce_import_logs')
              .update({ 
                imported_products: importedCount,
                failed_products: failedCount,
                progress_message: `Importing product ${processedCount} of ${totalProducts}`
              })
              .eq('id', importLogId);
          }

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error processing product ${wcProduct.name}:`, error);
          failedCount++;
        }
      }
      
      // Delay between pages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update connection stats
    await supabase
      .from('woocommerce_connections')
      .update({
        last_import_at: new Date().toISOString(),
        total_products_imported: importedCount,
      })
      .eq('id', connection.id);

    // Mark import as completed
    await supabase
      .from('woocommerce_import_logs')
      .update({
        status: 'completed',
        imported_products: importedCount,
        failed_products: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importLogId);

    console.log(`Import completed: ${importedCount} imported, ${failedCount} failed`);

  } catch (error) {
    console.error('Import process failed:', error);
    
    // Mark import as failed
    await supabase
      .from('woocommerce_import_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', importLogId);
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

async function importProductVariations(
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
      };

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert(variantData);

      if (variantError) {
        console.error(`Failed to insert variant for product ${wcProduct.name}:`, variantError);
      }
      
      // Small delay between variation imports
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } catch (error) {
    console.error(`Error importing variations for product ${wcProduct.name}:`, error);
  }
}
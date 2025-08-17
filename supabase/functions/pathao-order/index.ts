import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PathaoOrderRequest {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city?: number;
  recipient_zone?: number;
  recipient_area?: number;
  item_type: number;
  special_instruction?: string;
  item_quantity: number;
  item_weight: number;
  item_description: string;
  amount_to_collect: number;
  delivery_type: number;
}

interface PathaoSettings {
  api_base_url: string;
  client_id: string;
  client_secret: string;
  username: string;
  password: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
}

async function getAccessToken(settings: PathaoSettings, supabaseClient: any): Promise<string> {
  // Check if current token is still valid
  if (settings.access_token && settings.token_expires_at) {
    const expiresAt = new Date(settings.token_expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // If token expires in more than 10 minutes, use it
    if (timeUntilExpiry > 10 * 60 * 1000) {
      return settings.access_token;
    }
  }

  console.log('Getting new access token from Pathao...');
  
  // Get new access token
  const tokenResponse = await fetch(`${settings.api_base_url}/aladdin/api/v1/issue-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      grant_type: 'password',
      username: settings.username,
      password: settings.password,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Pathao token error:', errorText);
    throw new Error(`Failed to get Pathao access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('Pathao token response received');

  if (!tokenData.access_token) {
    throw new Error('No access token in Pathao response');
  }

  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 432000));

  // Update settings in database
  const { data: existingSettings } = await supabaseClient
    .from('pathao_settings')
    .select('id')
    .maybeSingle();

  if (existingSettings?.id) {
    const { error: updateError } = await supabaseClient
      .from('pathao_settings')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSettings.id);

    if (updateError) {
      console.error('Failed to update token in database:', updateError);
    }
  }

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Get auth header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header present:', !!authHeader);
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing authorization header',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Set auth context with proper token extraction
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    console.log('User auth result:', { user: !!user, error: authError?.message });

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Unauthorized: ' + (authError?.message || 'Invalid user'),
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const orderData: PathaoOrderRequest = await req.json()
    console.log('Processing Pathao order request:', orderData.merchant_order_id);

    // Get Pathao settings from database
    const { data: pathaoSettings, error: settingsError } = await supabaseClient
      .from('pathao_settings')
      .select('*')
      .maybeSingle()

    if (settingsError) {
      console.error('Database error while fetching Pathao settings:', settingsError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error accessing Pathao settings. Please try again.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!pathaoSettings) {
      console.error('No Pathao settings found in database');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Pathao settings not configured. Please configure your Pathao credentials in Settings → System Settings → Pathao Settings first.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get valid access token
    const accessToken = await getAccessToken(pathaoSettings, supabaseClient);

    // Prepare the request to Pathao API with proper data validation
    const pathaoOrderPayload = {
      store_id: orderData.store_id,
      merchant_order_id: orderData.merchant_order_id,
      recipient_name: orderData.recipient_name,
      recipient_phone: orderData.recipient_phone,
      recipient_address: orderData.recipient_address,
      recipient_city: orderData.recipient_city || 1, // Default to Dhaka if not provided
      recipient_zone: orderData.recipient_zone || 1, // Default zone
      recipient_area: orderData.recipient_area, // Optional field
      delivery_type: orderData.delivery_type,
      item_type: orderData.item_type,
      special_instruction: orderData.special_instruction || "",
      item_quantity: orderData.item_quantity,
      item_weight: orderData.item_weight,
      item_description: orderData.item_description,
      amount_to_collect: orderData.amount_to_collect,
    }

    console.log('Sending order to Pathao API...');
    console.log('Pathao payload:', JSON.stringify(pathaoOrderPayload, null, 2));

    // Make request to Pathao API
    const pathaoResponse = await fetch(`${pathaoSettings.api_base_url}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(pathaoOrderPayload),
    })

    const pathaoResult = await pathaoResponse.json()
    console.log('Pathao API response:', pathaoResult);

    if (!pathaoResponse.ok) {
      console.error('Pathao API Error:', pathaoResult)
      
      return new Response(
        JSON.stringify({
          success: false,
          message: pathaoResult.message || 'Failed to create order with Pathao',
          error: pathaoResult
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Log the successful order creation
    console.log('Pathao order created successfully:', pathaoResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order submitted to Pathao successfully',
        consignment_id: pathaoResult.data?.consignment_id || pathaoResult.consignment_id,
        order_id: pathaoResult.data?.order_id || pathaoResult.order_id,
        delivery_fee: pathaoResult.data?.delivery_fee || pathaoResult.delivery_fee,
        pathao_response: pathaoResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in pathao-order function:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
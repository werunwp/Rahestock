import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PathaoOrderRequest {
  store_id: number;
  merchant_order_id: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: string;
  recipient_zone: string;
  item_type: number;
  special_instruction: string;
  item_quantity: number;
  item_weight: number;
  item_description: string;
  amount_to_collect: number;
  delivery_type: number;
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
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Set auth context
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const orderData: PathaoOrderRequest = await req.json()

    // Get Pathao settings from database
    const { data: pathaoSettings, error: settingsError } = await supabaseClient
      .from('pathao_settings')
      .select('*')
      .limit(1)
      .single()

    if (settingsError || !pathaoSettings) {
      throw new Error('Pathao settings not configured')
    }

    // Prepare the request to Pathao API
    const pathaoOrderPayload = {
      store_id: orderData.store_id,
      merchant_order_id: orderData.merchant_order_id,
      sender_name: orderData.sender_name,
      sender_phone: orderData.sender_phone,
      sender_address: orderData.sender_address,
      recipient_name: orderData.recipient_name,
      recipient_phone: orderData.recipient_phone,
      recipient_address: orderData.recipient_address,
      recipient_city: orderData.recipient_city || "Dhaka",
      recipient_zone: orderData.recipient_zone || "Dhaka",
      item_type: orderData.item_type,
      special_instruction: orderData.special_instruction || "",
      item_quantity: orderData.item_quantity,
      item_weight: orderData.item_weight,
      item_description: orderData.item_description,
      amount_to_collect: orderData.amount_to_collect,
      delivery_type: orderData.delivery_type,
    }

    // Make request to Pathao API
    const pathaoResponse = await fetch(`${pathaoSettings.api_base_url}/aladdin/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pathaoSettings.access_token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(pathaoOrderPayload),
    })

    const pathaoResult = await pathaoResponse.json()

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
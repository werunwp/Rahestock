import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CourierOrderRequest {
  sale_id: string;
  invoice_number: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  item_description: string;
  amount_to_collect: number;
  total_items: number;
  order_date: string;
  special_instruction?: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
  }>;
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

    // Set auth context
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

    const orderData: CourierOrderRequest = await req.json()
    console.log('Processing courier order request for invoice:', orderData.invoice_number);

    // Get courier webhook settings from database
    const { data: webhookSettings, error: settingsError } = await supabaseClient
      .from('courier_webhook_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    if (settingsError) {
      console.error('Database error while fetching webhook settings:', settingsError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Error accessing webhook settings. Please try again.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!webhookSettings) {
      console.error('No active webhook settings found in database');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Courier webhook settings not configured or disabled. Please configure your webhook settings first.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Sending order to webhook URL:', webhookSettings.webhook_url);
    console.log('Order payload:', JSON.stringify(orderData, null, 2));

    // Send order data to the configured webhook
    const webhookResponse = await fetch(webhookSettings.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Courier-Webhook-Sender/1.0',
      },
      body: JSON.stringify(orderData),
    })

    let webhookResult;
    try {
      webhookResult = await webhookResponse.json()
    } catch (e) {
      webhookResult = await webhookResponse.text()
    }
    console.log('Webhook response status:', webhookResponse.status);
    console.log('Webhook response:', webhookResult);

    if (!webhookResponse.ok) {
      console.error('Webhook Error Response:', webhookResult)
      console.error('Webhook Status:', webhookResponse.status)
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Webhook Error (${webhookResponse.status}): Failed to send order to courier webhook`,
          error: { status: webhookResponse.status, body: webhookResult }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Log the successful order submission
    console.log('Order sent to courier webhook successfully:', webhookResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order submitted to courier webhook successfully',
        webhook_response: webhookResult,
        webhook_name: webhookSettings.webhook_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in courier-webhook function:', error)
    
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
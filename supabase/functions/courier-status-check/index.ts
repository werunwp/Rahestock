import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusCheckRequest {
  action: string;
  consignment_id: string;
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

    if (authError || !user) {
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

    const requestData: StatusCheckRequest = await req.json()
    console.log('Processing status check request for consignment:', requestData.consignment_id);

    // Get courier webhook settings from database
    const { data: webhookSettings, error: settingsError } = await supabaseClient
      .from('courier_webhook_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle()

    console.log('Webhook settings query result:', { 
      hasData: !!webhookSettings, 
      error: settingsError?.message,
      settingsFound: webhookSettings ? {
        id: webhookSettings.id,
        url: webhookSettings.webhook_url,
        hasUsername: !!webhookSettings.auth_username,
        hasPassword: !!webhookSettings.auth_password
      } : null
    });

    if (settingsError) {
      console.error('Database error fetching webhook settings:', settingsError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Database error: ' + settingsError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!webhookSettings) {
      console.error('No active webhook settings found');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Courier webhook settings not configured or disabled',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Checking status with webhook URL:', webhookSettings.webhook_url);

    // Prepare headers for webhook request
    const webhookHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Courier-Status-Checker/1.0',
    };

    // Add basic auth if configured
    if (webhookSettings.auth_username && webhookSettings.auth_password) {
      const credentials = btoa(`${webhookSettings.auth_username}:${webhookSettings.auth_password}`);
      webhookHeaders['Authorization'] = `Basic ${credentials}`;
      console.log('Added basic auth credentials for status check');
    }

    // Send status check request to the configured webhook
    const statusCheckPayload = {
      action: 'check_status',
      consignment_id: requestData.consignment_id,
      type: 'status_check'
    };

    console.log('Sending request to:', webhookSettings.webhook_url);
    console.log('Request headers:', Object.keys(webhookHeaders));
    console.log('Request payload:', statusCheckPayload);

    const webhookResponse = await fetch(webhookSettings.webhook_url, {
      method: 'POST',
      headers: webhookHeaders,
      body: JSON.stringify(statusCheckPayload),
    })

    let webhookResult;
    try {
      webhookResult = await webhookResponse.json()
    } catch (e) {
      webhookResult = await webhookResponse.text()
    }

    console.log('Status check response status:', webhookResponse.status);
    console.log('Status check response:', webhookResult);

    if (!webhookResponse.ok) {
      console.error('Status Check Error Response:', webhookResult)
      return new Response(
        JSON.stringify({
          success: false,
          message: `Status Check Error (${webhookResponse.status}): Failed to check order status`,
          error: { status: webhookResponse.status, body: webhookResult }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status check completed successfully',
        webhook_response: webhookResult,
        webhook_name: webhookSettings.webhook_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in courier-status-check function:', error)
    
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
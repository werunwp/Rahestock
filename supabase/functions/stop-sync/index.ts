import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { syncLogId } = await req.json();

    if (!syncLogId) {
      return new Response(
        JSON.stringify({ error: 'Sync log ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update sync log status to failed with stopped message
    const { error: updateError } = await supabase
      .from('woocommerce_sync_logs')
      .update({
        status: 'failed',
        error_message: 'Sync stopped by user',
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId)
      .eq('status', 'in_progress'); // Only update if still in progress

    if (updateError) {
      console.error('Error stopping sync:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to stop sync' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Sync stopped successfully',
        syncLogId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Stop sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
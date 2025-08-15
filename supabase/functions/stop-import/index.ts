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
    const { importLogId } = await req.json();

    if (!importLogId) {
      return new Response(
        JSON.stringify({ error: 'Import log ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update import log status to failed with stopped message
    const { error: updateError } = await supabase
      .from('woocommerce_import_logs')
      .update({
        status: 'failed',
        error_message: 'Import stopped by user',
        completed_at: new Date().toISOString(),
      })
      .eq('id', importLogId)
      .eq('status', 'in_progress'); // Only update if still in progress

    if (updateError) {
      console.error('Error stopping import:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to stop import' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Import stopped successfully',
        importLogId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Stop import error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
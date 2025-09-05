import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CourierStatusUpdate {
  consignment_id: string;
  status: string;
  tracking_number?: string;
  estimated_delivery?: string;
  current_location?: string;
  notes?: string;
  timestamp?: string;
  // Additional fields that couriers might send
  delivery_date?: string;
  return_reason?: string;
  courier_name?: string;
  courier_phone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received courier status update webhook');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    // Parse the incoming webhook data
    let statusUpdate: CourierStatusUpdate;
    try {
      const rawPayload = await req.json();
      
      // Handle different webhook response formats
      if (rawPayload.data && Array.isArray(rawPayload.data)) {
        // Format: { "data": [{ "order_status": "...", "order_status_slug": "..." }] }
        const firstItem = rawPayload.data[0];
        statusUpdate = {
          consignment_id: firstItem.consignment_id,
          status: firstItem.order_status_slug || firstItem.order_status || 'pending',
          notes: `Status: ${firstItem.order_status}`,
          timestamp: firstItem.updated_at
        };
      } else if (rawPayload.data && rawPayload.data.consignment_id) {
        // Format: { "data": { "consignment_id": "...", "order_status": "..." } }
        statusUpdate = {
          consignment_id: rawPayload.data.consignment_id,
          status: rawPayload.data.order_status_slug || rawPayload.data.order_status || 'pending',
          notes: `Status: ${rawPayload.data.order_status}`,
          timestamp: rawPayload.data.updated_at
        };
      } else if (rawPayload.consignment_id) {
        // Direct format: { "consignment_id": "...", "status": "..." }
        statusUpdate = rawPayload;
      } else {
        throw new Error('Unsupported webhook payload format');
      }
      
      console.log('Parsed status update:', JSON.stringify(statusUpdate, null, 2));
    } catch (e) {
      console.error('Failed to parse webhook payload:', e);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid JSON payload: ' + e.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Status update payload:', JSON.stringify(statusUpdate, null, 2));

    // Validate required fields
    if (!statusUpdate.consignment_id || !statusUpdate.status) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: consignment_id and status',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Find the sale with this consignment ID
    const { data: sale, error: saleError } = await supabaseClient
      .from('sales')
      .select('id, invoice_number, customer_name, courier_status')
      .eq('consignment_id', statusUpdate.consignment_id)
      .maybeSingle();

    if (saleError) {
      console.error('Database error finding sale:', saleError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Database error: ' + saleError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!sale) {
      console.log(`No sale found for consignment ID: ${statusUpdate.consignment_id}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `No sale found for consignment ID: ${statusUpdate.consignment_id}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Updating sale ${sale.id} (${sale.invoice_number}) from ${sale.courier_status} to ${statusUpdate.status}`);

    // Prepare update data
    const updateData: any = {
      courier_status: statusUpdate.status,
      order_status: statusUpdate.status, // Keep for backward compatibility
      last_status_check: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (statusUpdate.tracking_number) {
      updateData.tracking_number = statusUpdate.tracking_number;
    }
    if (statusUpdate.estimated_delivery) {
      updateData.estimated_delivery = statusUpdate.estimated_delivery;
    }
    if (statusUpdate.current_location) {
      updateData.current_location = statusUpdate.current_location;
    }
    if (statusUpdate.notes) {
      updateData.courier_notes = statusUpdate.notes;
    }
    if (statusUpdate.delivery_date) {
      updateData.delivery_date = statusUpdate.delivery_date;
    }
    if (statusUpdate.return_reason) {
      updateData.return_reason = statusUpdate.return_reason;
    }
    if (statusUpdate.courier_name) {
      updateData.courier_name = statusUpdate.courier_name;
    }
    if (statusUpdate.courier_phone) {
      updateData.courier_phone = statusUpdate.courier_phone;
    }

    // Map courier status to payment status for business logic
    // Handle various status formats from different courier services
    const normalizedStatus = statusUpdate.status.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    if (normalizedStatus.includes('delivered') || normalizedStatus.includes('completed')) {
      updateData.payment_status = 'paid';
      updateData.delivery_date = updateData.delivery_date || new Date().toISOString();
    } else if (normalizedStatus.includes('returned') || normalizedStatus.includes('cancelled') || 
               normalizedStatus.includes('pickup_cancelled') || normalizedStatus.includes('lost')) {
      updateData.payment_status = 'cancelled';
    }
    
    // Normalize the status for consistent display
    let displayStatus = statusUpdate.status;
    if (normalizedStatus.includes('pickup_cancelled')) {
      displayStatus = 'cancelled';
    } else if (normalizedStatus.includes('in_transit') || normalizedStatus.includes('picked_up')) {
      displayStatus = 'in_transit';
    } else if (normalizedStatus.includes('out_for_delivery')) {
      displayStatus = 'out_for_delivery';
    }
    
    updateData.courier_status = displayStatus;

    // Update the sale in database
    const { error: updateError } = await supabaseClient
      .from('sales')
      .update(updateData)
      .eq('id', sale.id);

    if (updateError) {
      console.error('Failed to update sale status:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to update sale status: ' + updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Log the status change for audit purposes
    await supabaseClient
      .from('courier_status_logs')
      .insert({
        sale_id: sale.id,
        consignment_id: statusUpdate.consignment_id,
        old_status: sale.courier_status,
        new_status: statusUpdate.status,
        courier_notes: statusUpdate.notes,
        timestamp: new Date().toISOString(),
        webhook_data: statusUpdate
      });

    console.log(`Successfully updated sale ${sale.id} status to ${statusUpdate.status}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Status update processed successfully',
        sale_id: sale.id,
        invoice_number: sale.invoice_number,
        old_status: sale.courier_status,
        new_status: statusUpdate.status,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in courier-status-update function:', error)
    
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

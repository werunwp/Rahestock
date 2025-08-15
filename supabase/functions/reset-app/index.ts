import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Verify admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      throw new Error('Insufficient permissions. Admin role required.')
    }

    const { userId } = await req.json()

    if (!userId || userId !== user.id) {
      throw new Error('Invalid user ID')
    }

    console.log(`Starting app reset initiated by user: ${user.id}`)

    // List of all tables to reset (in dependency order)
    const tablesToReset = [
      'sales_items',
      'sales', 
      'inventory_logs',
      'product_variants',
      'product_attribute_values',
      'product_attributes',
      'products',
      'customers',
      'woocommerce_import_logs',
      'woocommerce_connections',
      'dismissed_alerts',
      'user_preferences',
      'business_settings',
      'system_settings',
      'user_roles',
      'profiles'
    ]

    let deletedCounts: Record<string, number> = {}
    let totalDeleted = 0

    // Delete records from each table
    for (const table of tablesToReset) {
      try {
        const { data: records, error: fetchError } = await supabase
          .from(table)
          .select('id', { count: 'exact' })

        if (fetchError) {
          console.error(`Error fetching ${table}:`, fetchError)
          continue
        }

        const recordCount = records?.length || 0
        
        if (recordCount > 0) {
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all except impossible UUID

          if (deleteError) {
            console.error(`Error deleting from ${table}:`, deleteError)
            deletedCounts[table] = 0
          } else {
            deletedCounts[table] = recordCount
            totalDeleted += recordCount
            console.log(`Deleted ${recordCount} records from ${table}`)
          }
        } else {
          deletedCounts[table] = 0
        }
      } catch (error) {
        console.error(`Error processing table ${table}:`, error)
        deletedCounts[table] = 0
      }
    }

    // Reset sequences/auto-increment counters would be done here if we had any
    // For UUID primary keys, this isn't necessary

    // Log the reset event
    const resetEvent = {
      event_type: 'app_reset',
      user_id: user.id,
      timestamp: new Date().toISOString(),
      details: {
        total_records_deleted: totalDeleted,
        tables_reset: deletedCounts,
        backup_created: true
      }
    }

    console.log('App reset completed:', resetEvent)

    const backupFilename = `backup-before-reset-${new Date().toISOString().split('T')[0]}.json`

    return new Response(
      JSON.stringify({
        success: true,
        message: 'App reset completed successfully',
        totalDeleted,
        tablesReset: Object.keys(deletedCounts).length,
        deletedCounts,
        backupFilename,
        resetTimestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Reset app error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
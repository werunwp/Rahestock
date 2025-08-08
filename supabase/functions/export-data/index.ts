import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

interface ExportOptions {
  includeTables?: string[]
  excludeTables?: string[]
}

const DEFAULT_TABLES = [
  'system_settings',
  'business_settings', 
  'profiles',
  'user_roles',
  'products',
  'customers',
  'sales',
  'sales_items',
  'inventory_logs',
  'user_preferences',
  'dismissed_alerts'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get user from auth header
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      throw new Error('Admin access required')
    }

    const { includeTables, excludeTables }: ExportOptions = await req.json().catch(() => ({}))
    
    let tablesToExport = includeTables?.length ? includeTables : DEFAULT_TABLES
    if (excludeTables?.length) {
      tablesToExport = tablesToExport.filter(table => !excludeTables.includes(table))
    }

    console.log('Exporting tables:', tablesToExport)

    const exportData: Record<string, any> = {}
    const errors: string[] = []

    // Export each table
    for (const table of tablesToExport) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          
        if (error) {
          console.error(`Error exporting ${table}:`, error)
          errors.push(`${table}: ${error.message}`)
        } else {
          exportData[table] = data
          console.log(`Exported ${table}: ${data?.length || 0} records`)
        }
      } catch (err) {
        console.error(`Failed to export ${table}:`, err)
        errors.push(`${table}: ${err.message}`)
      }
    }

    // Create manifest
    const manifest = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      tables: Object.keys(exportData),
      recordCounts: Object.fromEntries(
        Object.entries(exportData).map(([table, data]) => [table, data.length])
      ),
      errors: errors.length > 0 ? errors : undefined
    }

    // Create ZIP-like structure (JSON files)
    const files: Record<string, any> = {
      'manifest.json': manifest
    }

    for (const [table, data] of Object.entries(exportData)) {
      files[`${table}.json`] = data
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
    
    return new Response(JSON.stringify({
      success: true,
      filename: `backup-${timestamp}.zip`,
      files,
      manifest
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
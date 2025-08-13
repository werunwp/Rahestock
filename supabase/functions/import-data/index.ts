import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
)

interface ImportRequest {
  files: Record<string, any>
  dryRun?: boolean
  options?: {
    overwriteExisting?: boolean
    skipConflicts?: boolean
  }
}

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

    const { files, dryRun = false, options = {} }: ImportRequest = await req.json()
    
    if (!files || !files['manifest.json']) {
      throw new Error('Invalid backup: missing manifest.json')
    }

    const manifest = files['manifest.json']
    
    // Validate manifest
    if (!manifest.version || !manifest.timestamp || !manifest.tables) {
      throw new Error('Invalid manifest format')
    }

    // Version compatibility check (for future use)
    const supportedVersions = ['1.0.0']
    if (!supportedVersions.includes(manifest.version)) {
      throw new Error(`Unsupported backup version: ${manifest.version}. Supported: ${supportedVersions.join(', ')}`)
    }

    console.log('Import validation passed. Tables to import:', manifest.tables)

    const results: Record<string, any> = {}
    const errors: string[] = []

    if (dryRun) {
      // Dry run: validate data without writing
      for (const table of manifest.tables) {
        try {
          const tableData = files[`${table}.json`]
          if (!tableData) {
            errors.push(`Missing data file for table: ${table}`)
            continue
          }

          if (!Array.isArray(tableData)) {
            errors.push(`Invalid data format for table: ${table}`)
            continue
          }

          results[table] = {
            action: 'validate',
            recordCount: tableData.length,
            status: 'valid'
          }
        } catch (err) {
          errors.push(`Validation error for ${table}: ${err.message}`)
        }
      }

      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        results,
        errors: errors.length > 0 ? errors : undefined
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Actual import with transaction
    const { error: txError } = await supabase.rpc('begin_transaction')
    if (txError) {
      throw new Error('Failed to begin transaction')
    }

    try {
      // Import tables in dependency order to handle foreign key relationships
      const tableOrder = [
        'system_settings', 'business_settings', 'profiles', 'user_roles',
        'products', 'product_attributes', 'product_attribute_values', 'product_variants',
        'customers', 'sales', 'sales_items', 'inventory_logs', 'user_preferences', 'dismissed_alerts'
      ]
      
      // Sort tables according to dependency order
      const orderedTables = manifest.tables.sort((a, b) => {
        const indexA = tableOrder.indexOf(a)
        const indexB = tableOrder.indexOf(b)
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })

      for (const table of orderedTables) {
        try {
          const tableData = files[`${table}.json`]
          if (!tableData || !Array.isArray(tableData)) {
            errors.push(`Invalid data for table: ${table}`)
            continue
          }

          if (tableData.length === 0) {
            results[table] = { action: 'skip', recordCount: 0, reason: 'no data' }
            continue
          }

          // Use upsert for intelligent import - only update changed data
          const { data, error } = await supabase
            .from(table)
            .upsert(tableData, { 
              onConflict: 'id',
              ignoreDuplicates: false // Always allow updates
            })
            .select('id')

          if (error) {
            throw new Error(error.message)
          }

          results[table] = {
            action: 'upsert',
            recordCount: tableData.length,
            affectedRows: data?.length || 0,
            status: 'success'
          }

          console.log(`Imported ${table}: ${tableData.length} records`)

        } catch (err) {
          throw new Error(`Failed to import ${table}: ${err.message}`)
        }
      }

      // Commit transaction
      const { error: commitError } = await supabase.rpc('commit_transaction')
      if (commitError) {
        throw new Error('Failed to commit transaction')
      }

      return new Response(JSON.stringify({
        success: true,
        results,
        totalTables: manifest.tables.length,
        totalRecords: Object.values(results).reduce((sum: number, result: any) => 
          sum + (result.recordCount || 0), 0
        ),
        errors: errors.length > 0 ? errors : undefined
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      // Rollback on error
      await supabase.rpc('rollback_transaction')
      throw error
    }

  } catch (error) {
    console.error('Import error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
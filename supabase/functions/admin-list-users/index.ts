import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    console.log(`Admin ${user.email} listing users`)

    // Get all users from auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`)
    }

    // Get all profiles and roles in one query
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_id,
        full_name,
        phone,
        created_at,
        user_roles!inner(role)
      `)

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    // Combine auth data with profile data
    const combinedUsers = authUsers.users.map(authUser => {
      const profile = profiles.find(p => p.user_id === authUser.id)
      const userRole = (profile?.user_roles as any)?.[0]?.role || 'staff'
      
      return {
        id: authUser.id,
        full_name: profile?.full_name || 'Unknown User',
        email: authUser.email || '',
        phone: profile?.phone || null,
        role: userRole,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at
      }
    })

    // Sort by creation date (newest first)
    const sortedUsers = combinedUsers.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    console.log(`Found ${sortedUsers.length} users`)

    return new Response(
      JSON.stringify({ 
        success: true,
        users: sortedUsers
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Admin list users error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
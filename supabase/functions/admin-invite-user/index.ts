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

    const { email, role } = await req.json()

    if (!email || !role) {
      throw new Error('Email and role are required')
    }

    // Valid roles
    const validRoles = ['admin', 'manager', 'staff', 'viewer']
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role')
    }

    console.log(`Admin ${user.email} inviting ${email} with role ${role}`)

    // Create the user account using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        invited_by: user.id,
        invited_at: new Date().toISOString()
      }
    })

    if (createError) {
      console.error('User creation error:', createError)
      throw new Error(`Failed to create user: ${createError.message}`)
    }

    if (!newUser.user) {
      throw new Error('User creation failed - no user returned')
    }

    console.log(`User created successfully: ${newUser.user.id}`)

    // The profile and initial role will be created by the handle_new_user trigger
    // We need to update the role after creation
    await new Promise(resolve => setTimeout(resolve, 100)) // Small delay to ensure trigger completes

    // Update the user role to the specified role
    const { error: roleUpdateError } = await supabaseAdmin
      .from('user_roles')
      .update({ role })
      .eq('user_id', newUser.user.id)

    if (roleUpdateError) {
      console.error('Role update error:', roleUpdateError)
      // Don't throw here as user is already created
    }

    // Send password reset email so they can set their password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.co')}/auth/v1/verify?type=recovery&redirect_to=${encodeURIComponent(req.headers.get('origin') || 'http://localhost:3000')}`
      }
    })

    if (resetError) {
      console.error('Password reset email error:', resetError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role: role
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Admin invite error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
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

    const { userId, full_name, email, phone, role } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log(`Admin ${user.email} updating user ${userId}`)

    // Update email in auth if provided
    if (email) {
      const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email
      })

      if (emailUpdateError) {
        console.error('Email update error:', emailUpdateError)
        throw new Error(`Failed to update email: ${emailUpdateError.message}`)
      }
    }

    // Update profile
    const profileUpdates: any = {}
    if (full_name) profileUpdates.full_name = full_name
    if (phone !== undefined) profileUpdates.phone = phone

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', userId)

      if (profileUpdateError) {
        console.error('Profile update error:', profileUpdateError)
        throw new Error(`Failed to update profile: ${profileUpdateError.message}`)
      }
    }

    // Update role if provided
    if (role) {
      const validRoles = ['admin', 'manager', 'staff', 'viewer']
      if (!validRoles.includes(role)) {
        throw new Error('Invalid role')
      }

      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)

      if (roleUpdateError) {
        console.error('Role update error:', roleUpdateError)
        throw new Error(`Failed to update role: ${roleUpdateError.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'User updated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Admin update user error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
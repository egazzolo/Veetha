import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    console.log('🗑️ Delete user function called');
    
    // Get auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ User not found:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('✅ User authenticated:', user.email);

    // Delete user's meals
    console.log('🗑️ Deleting meals...');
    const { error: mealsError } = await supabase
      .from('meals')
      .delete()
      .eq('user_id', user.id)

    if (mealsError) {
      console.error('❌ Error deleting meals:', mealsError);
      throw mealsError;
    }

    // Delete user's profile
    console.log('🗑️ Deleting profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (profileError) {
      console.error('❌ Error deleting profile:', profileError);
      throw profileError;
    }

    // Delete auth user (using service role)
    console.log('🗑️ Deleting auth user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.error('❌ Error deleting auth user:', deleteError);
      throw deleteError;
    }

    console.log('✅ Account deleted successfully');

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
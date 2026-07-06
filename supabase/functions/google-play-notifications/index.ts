import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  try {
    const body = await req.json();
    
    // Google sends base64-encoded message
    const message = body?.message?.data;
    if (!message) return new Response('No message data', { status: 400 });

    const decoded = JSON.parse(atob(message));
    const notification = decoded.subscriptionNotification;

    if (!notification) return new Response('No subscription notification', { status: 200 });

    const { purchaseToken, notificationType } = notification;

    // Notification types:
    // 1 = RECOVERED (from account hold)
    // 2 = RENEWED
    // 3 = CANCELED
    // 4 = PURCHASED
    // 5 = ON_HOLD
    // 6 = IN_GRACE_PERIOD
    // 7 = RESTARTED
    // 12 = EXPIRED
    // 13 = REVOKED
    // 20 = PAUSED

    const isPremium = [1, 2, 4, 6, 7].includes(notificationType);

    // Find user by purchase token
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('android_purchase_token', purchaseToken)
      .limit(1);

    if (error || !profiles || profiles.length === 0) {
      console.log('No profile found for purchase token:', purchaseToken);
      return new Response('Profile not found', { status: 200 });
    }

    const userId = profiles[0].id;

    await supabase
      .from('profiles')
      .update({ is_premium: isPremium })
      .eq('id', userId);

    console.log(`Updated user ${userId} isPremium=${isPremium} for notificationType=${notificationType}`);
    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('google-play-notifications error:', err);
    return new Response('Error', { status: 500 });
  }
});
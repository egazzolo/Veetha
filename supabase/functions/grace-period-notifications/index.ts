import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const WARNING_DAYS = [30, 15, 7, 3, 1];

serve(async () => {
  try {
    const now = new Date();

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, push_token, grace_period_ends_at, is_premium, subscription_expires_at')
      .not('grace_period_ends_at', 'is', null)
      .not('push_token', 'is', null)
      .eq('is_premium', false);

    if (error) throw error;

    const messages = [];

    for (const profile of profiles || []) {
      if (profile.subscription_expires_at) continue;

      const end = new Date(profile.grace_period_ends_at);
      const msLeft = end.getTime() - now.getTime();
      if (msLeft <= 0) continue;

      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      if (!WARNING_DAYS.includes(daysLeft)) continue;

      messages.push({
        to: profile.push_token,
        title: daysLeft === 1 ? '⚡ Last day of full access' : `🌟 ${daysLeft} days of full access left`,
        body: daysLeft === 1
          ? 'Your free premium access ends today. Upgrade to keep all your features.'
          : `You have ${daysLeft} days left with full Veetha access. Upgrade to Premium to keep everything.`,
        data: { screen: 'Paywall' },
      });
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Send via Expo push API
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    console.log('Push result:', JSON.stringify(result));

    return new Response(JSON.stringify({ sent: messages.length }), { status: 200 });
  } catch (err) {
    console.error('grace-period-notifications error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook signature setup missing.' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: `Invalid webhook signature: ${
          e instanceof Error ? e.message : 'unknown error'
        }`,
      },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase environment variables are missing.');

    return NextResponse.json(
      { error: 'Webhook database configuration missing.' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId =
        session.metadata?.supabase_user_id ||
        session.client_reference_id;

      if (userId && session.subscription) {
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        const periodEnd = sub.current_period_end;

        const currentPeriodEnd =
          typeof periodEnd === 'number'
            ? new Date(periodEnd * 1000)
            : null;

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id:
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer?.id ?? null,
              stripe_subscription_id: sub.id,
              status: sub.status,
              current_period_end:
                currentPeriodEnd?.toISOString() ?? null,
            },
            { onConflict: 'user_id' }
          );

        if (error) throw error;
      }
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;

      if (userId) {
        const periodEnd = sub.current_period_end;

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id:
                typeof sub.customer === 'string'
                  ? sub.customer
                  : sub.customer.id,
              stripe_subscription_id: sub.id,
              status: sub.status,
              current_period_end:
                typeof periodEnd === 'number'
                  ? new Date(periodEnd * 1000).toISOString()
                  : null,
            },
            { onConflict: 'user_id' }
          );

        if (error) throw error;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook database update failed:', e);

    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}

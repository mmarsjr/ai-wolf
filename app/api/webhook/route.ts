import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

type SubscriptionRecord = {
  id: string;
  status: string;
  customer: string | { id: string };
  metadata?: Record<string, string>;
  current_period_end?: number;
  items?: {
    data?: Array<{
      current_period_end?: number;
    }>;
  };
};

function unwrapSubscription(value: unknown): SubscriptionRecord {
  const outer = value as {
    data?: SubscriptionRecord;
    id?: string;
    status?: string;
    customer?: string | { id: string };
  };

  const subscription =
    outer?.data && typeof outer.data === 'object'
      ? outer.data
      : (value as SubscriptionRecord);

  return subscription;
}

function getPeriodEnd(subscription: SubscriptionRecord): string | null {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  const periodEnd =
    typeof subscription.current_period_end === 'number'
      ? subscription.current_period_end
      : itemEnd;

  return typeof periodEnd === 'number'
    ? new Date(periodEnd * 1000).toISOString()
    : null;
}

function getCustomerId(
  customer: string | { id: string }
): string {
  return typeof customer === 'string' ? customer : customer.id;
}

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
  } catch (error) {
    return NextResponse.json(
      {
        error: `Invalid webhook signature: ${
          error instanceof Error ? error.message : 'unknown error'
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

        const response =
          await stripe.subscriptions.retrieve(subscriptionId);

        const sub = unwrapSubscription(response);

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: getCustomerId(sub.customer),
              stripe_subscription_id: sub.id,
              status: sub.status,
              current_period_end: getPeriodEnd(sub),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          throw error;
        }
      }
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = unwrapSubscription(event.data.object);
      const userId = sub.metadata?.supabase_user_id;

      if (userId) {
        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: getCustomerId(sub.customer),
              stripe_subscription_id: sub.id,
              status: sub.status,
              current_period_end: getPeriodEnd(sub),
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          throw error;
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);

    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500 }
    );
  }
}

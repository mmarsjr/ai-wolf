import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
export async function POST(request:Request){
 const signature=request.headers.get('stripe-signature');if(!signature||!process.env.STRIPE_WEBHOOK_SECRET)return NextResponse.json({error:'Webhook signature setup missing.'},{status:400});
 let event:Stripe.Event;try{event=stripe.webhooks.constructEvent(await request.text(),signature,process.env.STRIPE_WEBHOOK_SECRET)}catch(e){return NextResponse.json({error:`Invalid webhook signature: ${e instanceof Error?e.message:'unknown error'}`},{status:400})}
 const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);
 try{
  if(event.type==='checkout.session.completed'){
   const session=event.data.object as Stripe.Checkout.Session;const userId=session.metadata?.supabase_user_id||session.client_reference_id;
   if(userId&&session.subscription){const sub=await stripe.subscriptions.retrieve(session.subscription as string);await supabase.from('subscriptions').upsert({user_id:userId,stripe_customer_id:String(session.customer),stripe_subscription_id:sub.id,status:sub.status,current_period_end:new Date(sub.current_period_end?sub.current_period_end*1000:Date.now()).toISOString()},{onConflict:'user_id'});}
  }
  if(event.type==='customer.subscription.updated'||event.type==='customer.subscription.deleted'){
   const sub=event.data.object as Stripe.Subscription;const userId=sub.metadata?.supabase_user_id;
   if(userId)await supabase.from('subscriptions').upsert({user_id:userId,stripe_customer_id:String(sub.customer),stripe_subscription_id:sub.id,status:sub.status,current_period_end:new Date(sub.current_period_end?sub.current_period_end*1000:Date.now()).toISOString()},{onConflict:'user_id'});
  }
  return NextResponse.json({received:true});
 }catch(e){console.error('webhook database update failed',e);return NextResponse.json({error:'Webhook processing failed.'},{status:500})}
}

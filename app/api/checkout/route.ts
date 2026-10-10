import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { stripe } from '@/lib/stripe';
export async function POST(){
 try {
  const supabase=await createSupabaseServerClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:'Please sign in before starting checkout.'},{status:401});
  if(!process.env.STRIPE_PRICE_ID)return NextResponse.json({error:'Membership price is not configured yet.'},{status:500});
  const site=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';
  const session=await stripe.checkout.sessions.create({mode:'subscription',line_items:[{price:process.env.STRIPE_PRICE_ID,quantity:1}],client_reference_id:user.id,customer_email:user.email||undefined,metadata:{supabase_user_id:user.id},subscription_data:{metadata:{supabase_user_id:user.id}},success_url:`${site}/dashboard?checkout=success`,cancel_url:`${site}/#pricing`});
  return NextResponse.json({url:session.url});
 }catch(e){console.error('checkout error',e);return NextResponse.json({error:'Checkout could not start. Verify Stripe environment variables and try again.'},{status:500})}
}

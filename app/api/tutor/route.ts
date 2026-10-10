import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/lib/supabase-server';
const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
export async function POST(request:Request){
 try{
  const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Sign in to use your AI tutor.'},{status:401});
  const {data:subscription}=await supabase.from('subscriptions').select('status').eq('user_id',user.id).maybeSingle();if(!subscription||!['active','trialing'].includes(subscription.status||''))return NextResponse.json({error:'An active membership is required to use the AI tutor.'},{status:402});
  const body=await request.json();const messages=Array.isArray(body.messages)?body.messages.slice(-12):[];const lesson=typeof body.lesson==='string'?body.lesson.slice(0,120):'beginner AI';
  const safe=messages.filter((m:any)=>['user','assistant'].includes(m.role)&&typeof m.content==='string').map((m:any)=>({role:m.role as 'user'|'assistant',content:m.content.slice(0,1500)}));if(!safe.length)return NextResponse.json({error:'Ask a question to get started.'},{status:400});
  const response=await openai.chat.completions.create({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',messages:[{role:'system',content:`You are the AI Made Simple tutor for absolute beginners. Current lesson: ${lesson}. Teach patiently in plain English. Explain jargon the first time it appears. Prefer short steps, one concrete example, and a tiny practice task. Ask a clarifying question if needed. Do not promise earnings or outcomes. Be transparent about uncertainty and encourage verification of important facts. Do not request passwords, payment data, or sensitive personal details. If asked for dangerous, illegal, or harmful instructions, follow safety rules. Keep answers focused and friendly.`},...safe],max_tokens:650});
  return NextResponse.json({reply:response.choices[0]?.message?.content||'I could not form an answer just yet. Please try asking another way.'});
 }catch(e){console.error('tutor error',e);return NextResponse.json({error:'Your tutor is temporarily unavailable. Check the API configuration and try again.'},{status:500})}
}

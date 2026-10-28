const origin='https://amazingwasn.github.io';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 if(req.headers.get('origin')!==origin)return new Response('Forbidden',{status:403});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
 if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'Too large'},413);
 const raw=await req.text();if(raw.length>4096)return reply({error:'Too large'},413);
 const b=JSON.parse(raw);
 if(!uuid.test(b.id)||!uuid.test(b.session)||!uuid.test(b.token)||typeof b.path!=='string'||!b.path.startsWith('/Amanda-s-Site/')||b.path.length>240||!Number.isFinite(b.visible)||b.visible<0)return reply({error:'Invalid event'},400);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(b.token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'').trim();
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const result=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/record_portfolio_view',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_id:b.id,p_session:b.session,p_hash:hash,p_ip:ip||null,p_path:b.path,p_referrer:typeof b.referrer==='string'?b.referrer.slice(0,200):'',p_agent:req.headers.get('user-agent')||'',p_visible:Math.floor(b.visible)})});
 if(!result.ok){console.error('Analytics insert failed',result.status);return reply({error:'Storage unavailable'},503)}
 const ok=await result.json();return reply({ok},ok?200:429);
 }catch{return reply({error:'Invalid event'},400)}
});
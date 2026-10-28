(()=>{'use strict';const c=window.PORTFOLIO_ANALYTICS;let disabled=false;try{disabled=localStorage.getItem('portfolio-analytics-optout')==='1'}catch{}if(!c||disabled||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
let session;try{const old=JSON.parse(sessionStorage.getItem('portfolio-visit')||'null');session=old&&Date.now()-old.at<1800000?old.id:crypto.randomUUID()}catch{session=crypto.randomUUID()}
let sessionLastTouch=Date.now();let current,activeAt=document.visibilityState==='visible'?performance.now():null,total=0,queue=Promise.resolve();
const path=()=>location.pathname+(location.hash.startsWith('#film/')?location.hash.split('?')[0].slice(0,180):(location.hash.match(/^#(photography|film|strangers)$/)?.[0]||''));
const ref=(()=>{try{return new URL(document.referrer).hostname}catch{return ''}})();
function touch(){sessionLastTouch=Date.now();try{sessionStorage.setItem('portfolio-visit',JSON.stringify({id:session,at:Date.now()}))}catch{}}
function accrue(){if(activeAt!==null){total+=performance.now()-activeAt;activeAt=document.visibilityState==='visible'?performance.now():null}}
function post(payload){return fetch(c.url+'/functions/v1/portfolio-track',{method:'POST',headers:{'Content-Type':'application/json',apikey:c.collectorKey,Authorization:'Bearer '+c.collectorKey},body:JSON.stringify(payload),keepalive:true}).then(r=>r.ok).catch(()=>false)}
function send(){if(!current)return;accrue();touch();const payload={...current,visible:Math.round(total)};queue=queue.then(()=>post(payload))}
function start(){total=0;activeAt=document.visibilityState==='visible'?performance.now():null;current={id:crypto.randomUUID(),session,token:crypto.randomUUID(),path:path(),referrer:ref};touch();send()}
start();setInterval(()=>{if(document.visibilityState==='visible')send()},15000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-sessionLastTouch>1800000){session=crypto.randomUUID();start();return}send();activeAt=document.visibilityState==='visible'?performance.now():null});
window.addEventListener('pagehide',send);window.addEventListener('hashchange',()=>{if(path()!==current.path){send();start()}});
})();
import fs from "node:fs";
const file="data/compliments.json";
let data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):{version:1,days:{}};
const key=s=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
data.pool=Array.from(new Map([...(data.pool||[]),...Object.values(data.days)].map(v=>[key(v),v])).values());
for(let i=0;i<8;i++){
 await new Promise(r=>setTimeout(r,650));
 try{const r=await fetch("https://dumbapis.com/compliment",{signal:AbortSignal.timeout(10000)});if(!r.ok)break;const v=String((await r.json()).compliment||"").replace(/\s+/g," ").trim();if(v.length>=8&&v.length<=240&&!data.pool.some(p=>key(p)===key(v)))data.pool.push(v);}catch(e){break;}
}
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const start=Date.parse(today+"T12:00:00Z");
for(let offset=0;offset<=14;offset++){
 const date=new Date(start+offset*86400000).toISOString().slice(0,10);
 if(data.days[date])continue;
 const used=new Set(Object.entries(data.days).filter(([d])=>Math.abs(Date.parse(d)-Date.parse(date))<=366*86400000).map(([,v])=>key(v)));
 let chosen=data.pool.find(v=>!used.has(key(v)))||"";
 for(let attempt=0;!chosen&&attempt<20;attempt++){
  await new Promise(r=>setTimeout(r,650));
  try{
   const response=await fetch("https://dumbapis.com/compliment",{signal:AbortSignal.timeout(10000)});
   if(response.status===429)break;
   if(!response.ok)continue;
   const result=await response.json();
   const text=String(result.compliment||"").replace(/\s+/g," ").trim();
   if(text.length>=8&&text.length<=240&&!used.has(key(text))){chosen=text;if(!data.pool.some(v=>key(v)===key(text)))data.pool.push(text);break;}
  }catch(e){console.warn(e.message);}
 }
 if(!chosen){console.warn("No unused compliment available for "+date);break;}
 data.days[date]=chosen;
}
data.updated=new Date().toISOString();
fs.mkdirSync("data",{recursive:true});
fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");

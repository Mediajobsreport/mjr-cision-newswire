import fs from "node:fs";
const file="data/prep-fun.json";
const config={"dad-joke":"joke","would-you-rather":"question",excuse:"excuse",fact:"fact"};
const key=s=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
const valid=s=>typeof s==="string"&&s.length>=8&&s.length<=600&&!/\b(fuck|fucking|shit|bitch|asshole|suicide)\b/i.test(s)&&!s.includes("http");
const select=(date,days,pool)=>{const used=new Set(Object.entries(days).filter(([d])=>Math.abs(Date.parse(d)-Date.parse(date))<=366*86400000).map(([,v])=>key(v)));return pool.find(v=>!used.has(key(v)))||"";};
export {key,valid,select};
async function draw(endpoint,field){
 await new Promise(r=>setTimeout(r,850));
 const r=await fetch("https://dumbapis.com/"+endpoint,{signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error("API "+r.status);
 const value=String((await r.json())[field]||"").replace(/\s+/g," ").trim();
 return valid(value)?value:"";
}
async function main(){
 const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):{version:1,categories:{}};
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const start=Date.parse(today+"T12:00:00Z");
 for(const [endpoint,field] of Object.entries(config)){
  const state=data.categories[endpoint]||(data.categories[endpoint]={days:{},pool:[]});
  state.pool=Array.from(new Map([...state.pool,...Object.values(state.days)].map(v=>[key(v),v])).values());
  for(let i=0;i<8;i++){try{const v=await draw(endpoint,field);if(v&&!state.pool.some(p=>key(p)===key(v)))state.pool.push(v);}catch(e){console.warn(endpoint+": "+e.message);break;}}
  for(let i=0;i<=14;i++){
   const date=new Date(start+i*86400000).toISOString().slice(0,10);
   if(state.days[date])continue;
   let chosen=select(date,state.days,state.pool);
   for(let attempt=0;!chosen&&attempt<20;attempt++){
    try{const v=await draw(endpoint,field);if(v&&!state.pool.some(p=>key(p)===key(v)))state.pool.push(v);chosen=select(date,state.days,state.pool);}catch(e){console.warn(endpoint+": "+e.message);break;}
   }
   if(!chosen){console.warn("No unused "+endpoint+" for "+date);break;}
   state.days[date]=chosen;
  }
 }
 data.updated=new Date().toISOString();fs.mkdirSync("data",{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll("\\","/")))await main();

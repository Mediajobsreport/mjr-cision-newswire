import fs from "node:fs";
const file="data/daily-verses.json";
const refs=[
"Psalm 118:24","Philippians 4:6-7","Psalm 46:1","Micah 6:8","Matthew 5:14-16","Romans 12:9-12","Proverbs 3:5-6","Isaiah 40:31","1 Corinthians 13:4-7","Psalm 23:1-3",
"James 1:5","Galatians 5:22-23","Matthew 6:25-27","Psalm 121:1-2","Colossians 3:12-14","Romans 15:13","Hebrews 11:1","Psalm 19:14","1 Peter 5:7","Proverbs 16:24",
"John 14:27","Psalm 34:8","Ephesians 4:32","Joshua 1:9","Matthew 11:28-30","Psalm 100:4-5","Romans 8:38-39","James 1:19","Isaiah 26:3","Philippians 4:8",
"Psalm 139:13-14","1 Thessalonians 5:16-18","Proverbs 17:17","Matthew 7:12","2 Corinthians 5:7","Psalm 27:1","Hebrews 10:24","John 15:12","Romans 12:18","Psalm 37:3-5",
"Colossians 3:23-24","Lamentations 3:22-23","Psalm 16:8","Galatians 6:9-10","Proverbs 15:1","Matthew 5:9","Isaiah 41:10","Psalm 9:9-10","Ephesians 2:10","Philippians 4:13",
"Psalm 55:22","1 Corinthians 16:13-14","Proverbs 18:10","John 16:33","Hebrews 13:16","Psalm 103:1-5","Romans 12:21","James 3:17-18","Psalm 62:5-6","2 Timothy 1:7",
"Matthew 6:33-34","Psalm 31:24","1 John 4:19","Proverbs 11:25","Psalm 145:8-9","Ephesians 4:2-3","Romans 5:3-5","Psalm 4:8","Isaiah 43:2","Matthew 22:37-39",
"Psalm 119:105","1 Peter 4:10","Proverbs 12:25","2 Corinthians 4:16-18","Psalm 86:11","John 8:12","Hebrews 6:10","Psalm 90:12","Philippians 2:3-4","Romans 14:19",
"Psalm 147:3","James 1:17","Proverbs 19:21","John 13:34-35","Psalm 130:5","Colossians 3:15-17","Isaiah 55:12","Psalm 56:3-4","1 John 4:7-8","Matthew 5:7",
"Psalm 63:3-4","Romans 8:28","Proverbs 4:23","Ephesians 3:20-21","Psalm 91:1-2","2 Thessalonians 3:16","Isaiah 58:10-11","Psalm 73:26","1 Timothy 6:17-19","Matthew 6:19-21",
"Psalm 25:4-5","Romans 12:15-16","Proverbs 16:9","Hebrews 12:1-2","Psalm 84:11-12","John 6:35","1 Peter 3:8-9","Psalm 30:5","Isaiah 12:2","Luke 6:35-36",
"Psalm 92:1-2","2 Corinthians 9:6-8","Proverbs 14:21","Hebrews 4:16","Psalm 33:20-22","John 15:4-5","James 5:13","Psalm 143:8","Isaiah 61:1-3","Luke 12:32-34"
];
export function referenceFor(date){const time=Date.parse(date+"T12:00:00Z");if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date)throw Error("Invalid date");const day=Math.floor((time-Date.parse("2026-11-14T12:00:00Z"))/86400000);return refs[((day%refs.length)+refs.length)%refs.length];}
export async function main(){
 const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):{version:1,translation:"World English Bible",days:{},passages:{}};
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const start=Date.parse(today+"T12:00:00Z");
 for(let i=0;i<=14;i++){
  const date=new Date(start+i*86400000).toISOString().slice(0,10);
  if(data.days[date])continue;
  const ref=referenceFor(date);
  if(!data.passages[ref]){
   await new Promise(r=>setTimeout(r,2200));
   try{
    const r=await fetch("https://bible-api.com/"+encodeURIComponent(ref)+"?translation=web",{signal:AbortSignal.timeout(15000)});
    if(!r.ok)throw Error("Bible API "+r.status);
    const v=await r.json();
    if(v.translation_id!=="web"||!Array.isArray(v.verses)||!v.verses.length||typeof v.text!=="string"||!v.text.trim())throw Error("Invalid WEB passage");
    data.passages[ref]={reference:v.reference,text:v.text.replace(/\s+/g," ").trim(),translation:"World English Bible",translation_id:"web"};
   }catch(e){console.warn(ref+": "+e.message);continue;}
  }
  data.days[date]=data.passages[ref];
 }
 data.updated=new Date().toISOString();fs.mkdirSync("data",{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll("\\","/")))await main();

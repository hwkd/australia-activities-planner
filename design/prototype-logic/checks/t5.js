const fs=require("fs");
global.DCLogic=class{constructor(p){this.props=p||{};}setState(o){Object.assign(this.state,o);}};
const all=require("../content/content-all.json");let runs=0,bad=[];
const walk=(v,path,f)=>{if(v===undefined||(typeof v==="number"&&isNaN(v))||(typeof v==="string"&&/undefined|NaN|\[object/.test(v)))bad.push(f+" "+path+" = "+v);else if(Array.isArray(v))v.forEach((x,i)=>walk(x,path+"["+i+"]",f));else if(v&&typeof v==="object")for(const k in v)walk(v[k],path+"."+k,f);};
for(const n of ["A-Detail-Mobile","A-Detail-Desktop","B-Detail-Mobile","B-Detail-Desktop"]){
 const src=fs.readFileSync(require("path").join(__dirname,"../artboards/")+""+n+".dc.html","utf8");
 const js=src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
 const Comp=new Function(js+";return Component;")();
 for(const a of all)for(const w of ["sun","cloud","rain","hot"]){
  const c=new Comp({activity:a.id,weather:w});
  for(const o of ["central","quay","parra"])for(const m of ["pt","drive","ride"]){
   c.state.origin=o;c.state.mode=m;c.state.weather=w;c.state.adults=2;c.state.kids=1;c.state.poi=2;c.state.showBack=true;
   try{const v=c.renderVals();runs++;walk(v,a.id+"/"+w+"/"+o+"/"+m,n);
    if(n==="A-Detail-Mobile"&&w==="sun"&&o==="central"&&m==="pt")console.log(a.id.padEnd(14),v.route.total.padEnd(15),v.cost.total.padEnd(10),v.cost.lines.map(l=>l.label+" "+l.value).join(" | "));
   }catch(e){bad.push(n+" "+a.id+" "+w+" "+o+" "+m+" THROW "+e.message);}
  }}
}
console.log("runs",runs,"problems",bad.length);console.log([...new Set(bad)].slice(0,25).join("\n"));

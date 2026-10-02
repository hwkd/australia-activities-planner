const fs=require("fs");
const f=process.argv[2];const src=fs.readFileSync(f,"utf8");
const xdc=src.slice(src.indexOf("<x-dc>"),src.indexOf("</x-dc>")+7);
// ---- tag balance ----
const VOID=new Set(["meta","link","br","img","input","hr","source","col","area","base","wbr"]);
const stack=[];let bad=0;const re=/<!--[\s\S]*?-->|<style>[\s\S]*?<\/style>|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:="[^"]*"|='[^']*')?)*)\s*(\/?)>/g;let m;
while((m=re.exec(xdc))){if(!m[2])continue;const close=m[1]==="/",name=m[2].toLowerCase(),selfc=m[4]==="/";
 if(VOID.has(name))continue; if(selfc&&!close){if(!/^(path|rect|circle|use|stop|fecolormatrix|feturbulence)$/.test(name)){console.log("self-closing",name);bad++;}continue;}
 if(!close)stack.push([name,xdc.slice(0,m.index).split("\n").length]);else{const t=stack.pop();if(!t||t[0]!==name){console.log("mismatch </"+name+"> vs",t);bad++;break;}}}
if(stack.length){console.log("unclosed",stack.slice(-5));bad++;}
console.log("tags balanced:",bad===0);
// ---- holes with loop scope ----
const holes=[];const loops=[];const re2=/<(\/?)(sc-for)\b([^>]*)>|\{\{\s*([^}]*?)\s*\}\}/g;
// tokenise holes outside tags too; we need the sc-for attrs' own list hole to be in outer scope
let k;while((k=re2.exec(xdc))){ if(k[2]){ if(k[1]){loops.pop();} else {const L=/list="\{\{([^}]+)\}\}"/.exec(k[3])[1].trim(),as=/as="([^"]+)"/.exec(k[3])[1]; holes.push({p:L,sc:loops.slice()}); loops.push({L,as}); re2.lastIndex=k.index+k[0].length; } } else holes.push({p:k[4],sc:loops.slice()}); }
// drop duplicates of the sc-for list holes counted twice
const uniq={};holes.forEach(h=>{uniq[h.p+"|"+h.sc.map(s=>s.as+"="+s.L).join(",")]=h;});const H=Object.values(uniq);
console.log("unique holes:",H.length);
global.DCLogic=class{constructor(p){this.props=p||{};}setState(o){Object.assign(this.state,o);}};
const js=/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(src)[1];
const C=new Function(js+";return Component;")();
const get=(o,path)=>path.split(".").reduce((a,k)=>a==null?undefined:a[k],o);
const problems=new Set();let checks=0;
function check(v,tag){ for(const h of H){ const rec=(env,i)=>{ if(i===h.sc.length){ const [r,...rest]=h.p.split("."); let base=(r in env)?env[r]:v[r]; if(r==="true"||r==="false")return; const val=rest.length?get(base,rest.join(".")):base; checks++; if(val===undefined||(typeof val==="number"&&isNaN(val))||(typeof val==="string"&&/undefined|NaN|\[object/.test(val)))problems.add(h.p+" @"+tag); return;}
   const s=h.sc[i];const [r,...rest]=s.L.split(".");const base=(r in env)?env[r]:v[r];const list=rest.length?get(base,rest.join(".")):base; if(!Array.isArray(list)){problems.add("LIST "+s.L+" @"+tag);return;} list.forEach(x=>rec(Object.assign({},env,{[s.as]:x}),i+1)); };
   rec({},0);} }
let states=0;const run=(c,tag)=>{check(c.renderVals(),tag);states++;};
for(const props of [{},{sheet:"add",activity:"carriageworks"},{activity:"opera-tour"},{activity:"three-sisters",sheet:"add"}]){
 const c=new C(props);run(c,"init");
 for(const mo of ["2026-09","2026-10","2026-11","2026-12"]){c.setState({month:mo});const v=c.renderVals();
  for(const w of v.weeks)for(const cell of w.cells){cell.pick();c.setState({month:mo});run(c,mo+"/"+cell.date);
    const vv=c.renderVals(); vv.day.skies.forEach(s=>{s.pick();run(c,"sky "+cell.date+" "+s.key);});
  }}
 // exports
 c.setState({selected:"2026-10-03",month:"2026-10"});
 let v=c.renderVals();v.day.toCalendar();
 for(const sc of ["item","day","all"])for(const tg of ["apple","google","outlook"])for(const rm of ["none","30m","1d"])for(const dir of [true,false])for(const done of [false,true]){
   c.setState({focus:{date:"2026-10-03",id:"bondi-coogee"},exp:{scope:sc,target:tg,remind:rm,directions:dir,done}});run(c,"exp "+sc+tg+rm+dir+done);}
 c.setState({focus:null,exp:{scope:"day",target:"google",remind:"1d",directions:true,done:false}});run(c,"exp nofocus");
 // item-level calendar, swap, earlier/later, remove
 c.setState({sheet:null,selected:"2026-10-04"});v=c.renderVals();v.day.items.forEach(it=>{it.toCalendar();run(c,"itemcal");if(it.backup.swap)it.backup.swap();run(c,"swap");});
 v=c.renderVals();v.day.items.forEach(it=>{it.later();it.earlier();});run(c,"shift");
 c.setState({plan:Object.assign({},c.state.plan,{"2026-10-04":[{id:"three-sisters",start:"06:00"}]})});v=c.renderVals();console.log(props.activity||"-","earliest canEarlier:",v.day.items[0].canEarlier,v.day.items[0].cantEarlier);
 v.day.items[0].remove();run(c,"removed");v=c.renderVals();
 v.day.toCalendar();run(c,"empty export");
 // add sheet with several activities and done
 for(const id of ["carriageworks","opera-tour","three-sisters","manly"]){for(const d of ["2026-10-01","2026-10-03","2026-10-05","2026-10-10"]){c.setState({sheet:"add",add:{id,date:d,slot:"evening",done:false}});run(c,"add "+id+d);let vv=c.renderVals();vv.add.confirm();run(c,"added");vv=c.renderVals();vv.add.toCalendar();run(c,"add->cal");vv=c.renderVals();vv.exp.download();run(c,"dl");vv.exp.close();run(c,"close");}}
 // empty plan entirely
 c.setState({plan:{},sheet:null});run(c,"noplans");v=c.renderVals();v.goToday();run(c,"today");
}
console.log("states",states,"hole checks",checks,"problems",problems.size,[...problems].slice(0,15));

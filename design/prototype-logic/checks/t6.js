const fs=require("fs");
global.DCLogic=class{constructor(p){this.props=p||{};}setState(o){Object.assign(this.state,o);}};
const load=(n)=>{const src=fs.readFileSync(require("path").join(__dirname,"../artboards/")+""+n+".dc.html","utf8");return new Function(src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1]+";return Component;")();};
for(const [pn,cn] of [["A-Sky-Mobile","A-Detail-Mobile"],["A-Sky-Desktop","A-Detail-Desktop"],["B-Harbour-Mobile","B-Detail-Mobile"],["B-Harbour-Desktop","B-Detail-Desktop"]]){
 const P=load(pn),C=load(cn);const p=new P({});let v=p.renderVals();
 const ids=v.cards.map(c=>c.id);let log=[];
 // open every activity reachable in all weathers
 const seen=new Set();
 for(const w of ["sun","cloud","rain","hot"]){p.setState({weather:w,screen:"discover"});v=p.renderVals();
  for(const c of v.cards){c.open();v=p.renderVals();if(!v.isDetail||v.d.id!==c.id)throw new Error("open failed");seen.add(c.id);
   const props=()=>{const x=p.renderVals();return {activity:x.d.id,weather:x.weather,inSat:x.d.inSat,inSun:x.d.inSun,back:x.goBack,toggleSat:x.d.toggleSat,toggleSun:x.d.toggleSun,setWeather:x.setWeather};};
   const ch=new C(props());let cv=ch.renderVals();
   if(cv.a.id!==c.id||cv.weather!==w||!cv.hosted)throw new Error("child mismatch "+c.id);
   const was=cv.inSat;cv.toggleSat();ch.props=props();cv=ch.renderVals();if(cv.inSat===was||(p.state.sat.indexOf(c.id)>=0)!==cv.inSat)throw new Error("sat sync "+c.id);
   cv.toggleSat();ch.props=props();cv=ch.renderVals();if(cv.inSat!==was)throw new Error("sat off");
   cv.weathers[2].pick();ch.props=props();cv=ch.renderVals();if(cv.weather!=="rain"||p.state.weather!=="rain"||!cv.isRain)throw new Error("weather sync");
   p.setState({weather:w});cv.goBack();v=p.renderVals();if(v.isDetail)throw new Error("back");
  }}
 // standalone still works
 const st=new C({activity:"manly",weather:"hot"});let sv=st.renderVals();sv.toggleSun();sv=st.renderVals();sv.weathers[0].pick();sv=st.renderVals();
 console.log(pn,"->",cn,"opened",seen.size,"activities OK; standalone:",sv.inSun,sv.weather,sv.hosted,typeof sv.goBack);
}

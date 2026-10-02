const fs=require("fs");
global.DCLogic=class{constructor(p){this.props=p||{};}setState(o){Object.assign(this.state,o);}};
const load=(n)=>{const src=fs.readFileSync(require("path").join(__dirname,"../artboards/")+""+n+".dc.html","utf8");return new Function(src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1]+";return Component;")();};
const all=require("../content/content-all.json");
for(const [pn,cn] of [["Main","V1-Detail-Mobile"],["Desktop","V1-Detail-Desktop"]]){
 const P=load(pn),C=load(cn);let opened=0,hops=0;
 for(const w of ["sun","cloud","rain","hot"]){
  const p=new P({});p.setState({weather:w,screen:"discover"});let v=p.renderVals();
  for(const card of v.cards){card.open();
   const props=()=>{const x=p.renderVals();return {activity:x.d.id,weather:x.weatherKey,inSat:x.d.inSat,inSun:x.d.inSun,back:x.goBack,toggleSat:x.d.toggleSat,toggleSun:x.d.toggleSun,setWeather:x.setWeather,openActivity:x.openActivity};};
   const ch=new C(props());let cv=ch.renderVals();
   if(!cv.hosted||cv.a.name!==card.name||cv.weather!==p.state.weather)throw new Error("mount "+card.name);
   const was=cv.inSat;cv.toggleSat();ch.props=props();cv=ch.renderVals();if(cv.inSat===was)throw new Error("sat sync");cv.toggleSat();ch.props=props();cv=ch.renderVals();
   cv.weathers[3].pick();ch.props=props();cv=ch.renderVals();if(cv.weather!=="hot"||p.state.weather!=="hot")throw new Error("wx sync");p.setState({weather:w});
   const pr=cv.pairs.find(q=>q.canOpen);if(pr){const prev=ch.props;pr.open({});ch.props=props();ch.componentDidUpdate(prev);if(ch.renderVals().a.id!==pr.activityId)throw new Error("pair");hops++;}
   opened++;ch.renderVals().goBack();if(p.renderVals().isDetail)throw new Error("back");p.setState({screen:"discover"});
  }}
 console.log(pn,"->",cn,"opened",opened,"pair hops",hops,"OK");
}

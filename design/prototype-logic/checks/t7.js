const fs=require("fs");
global.DCLogic=class{constructor(p){this.props=p||{};}setState(o){Object.assign(this.state,typeof o==="function"?o(this.state):o);}};
const load=(n)=>{const src=fs.readFileSync(require("path").join(__dirname,"../artboards/")+""+n+".dc.html","utf8");return new Function(src.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1]+";return Component;")();};
const all=require("../content/content-all.json");
let tot=0,tap=0;all.forEach(a=>a.pairings.forEach(p=>{tot++;if(p.activityId)tap++;}));
console.log("pairings",tot,"tappable",tap);
for(const [pn,cn] of [["A-Sky-Mobile","A-Detail-Mobile"],["A-Sky-Desktop","A-Detail-Desktop"],["B-Harbour-Mobile","B-Detail-Mobile"],["B-Harbour-Desktop","B-Detail-Desktop"]]){
 const P=load(pn),C=load(cn);let hops=0;
 for(const a of all){
  const p=new P({});p.setState({screen:"discover"});p.renderVals();p.setState({screen:"detail",openId:a.id,from:"discover"});
  const props=()=>{const x=p.renderVals();return {activity:x.d.id,weather:x.weather,inSat:x.d.inSat,inSun:x.d.inSun,back:x.goBack,toggleSat:x.d.toggleSat,toggleSun:x.d.toggleSun,setWeather:x.setWeather,openActivity:x.openActivity};};
  const ch=new C(props());if(cn.startsWith("B"))ch.state.mode="drive";ch.state.poi=3; // A has no travel modes since D14
  let v=ch.renderVals();
  for(const pr of v.pairs.filter(q=>q.canOpen)){
   const prev=ch.props;pr.open({currentTarget:{closest:()=>null}});ch.props=props();ch.componentDidUpdate(prev);v=ch.renderVals();
   if(v.a.id!==pr.activityId)throw new Error(cn+" hosted hop "+a.id+"->"+pr.activityId+" got "+v.a.id);
   if(ch.state.poi!==null)throw new Error("poi not reset");
   const A=all.find(x=>x.id===pr.activityId);if(cn.startsWith("B")&&ch.state.mode==="drive"&&!A.routes.drive)throw new Error("mode not reset");
   hops++;const back=p.renderVals();back.goBack();if(p.renderVals().isDetail)throw new Error("back");p.setState({screen:"detail",openId:a.id});ch.props=props();ch.componentDidUpdate({activity:"x"});v=ch.renderVals();
  }
  // standalone
  const st=new C({activity:a.id});let sv=st.renderVals();const q=sv.pairs.find(z=>z.canOpen);
  if(q){q.open({currentTarget:{closest:()=>({querySelectorAll:()=>[{scrollTop:120},{scrollTop:0}]})}});sv=st.renderVals();if(sv.a.id!==q.activityId)throw new Error("standalone hop");
   st.componentDidUpdate({activity:"other"});if(st.renderVals().a.id!==a.id)throw new Error("tweak change should clear viewing");}
 }
 console.log(cn,"hosted hops OK:",hops);
}

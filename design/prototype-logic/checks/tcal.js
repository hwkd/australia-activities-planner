const fs=require("fs");
global.DCLogic=class{constructor(p){this.props=p||{};}setState(o){Object.assign(this.state,o);}};
const C=new Function(fs.readFileSync(process.argv[2]||require("path").join(__dirname,"../engines/calendar-engine.js"),"utf8").replace(/^[\s\S]*?(class Component)/,"$1")+";return Component;")();
const bad=[];const walk=(v,p)=>{if(v===undefined||(typeof v==="number"&&isNaN(v))||(typeof v==="string"&&/undefined|NaN|\[object/.test(v)))bad.push(p);else if(Array.isArray(v))v.forEach((x,i)=>walk(x,p+"["+i+"]"));else if(v&&typeof v==="object")for(const k in v)walk(v[k],p+"."+k);};
const c=new C({});let v=c.renderVals();walk(v,"init");
console.log(v.monthLabel, v.weeks.length+" weeks", v.weeks[0].cells.map(x=>x.num).join(","));
console.log("selected:",v.day.title,v.day.rel,v.day.forecastLabel,v.day.countLabel);
v.day.items.forEach(i=>console.log("  ",i.timeLabel,i.name,"|",i.fitText,"|",i.warn));
v.weeks.forEach(w=>console.log(w.cells.map(x=>(x.isToday?"*":"")+x.num+(x.hasPlan?"("+x.count+(x.warn?"!":"")+")":"")+(x.isHoliday?"H":"")).join(" ")));
// Sunday rainy -> skip + plan B
v.weeks[0].cells[6].pick();v=c.renderVals();const it=v.day.items[0];console.log("sun 4:",it.name,it.fitText,"backup:",it.backup.name);it.backup.swap();v=c.renderVals();console.log("after swap:",v.day.items.map(x=>x.name+" "+x.fitText));
// carriageworks + newtown sat 10 overlap?
c.setState({selected:"2026-10-10",forecast:Object.assign({},c.state.forecast,{"2026-10-10":"rain"})});v=c.renderVals();v.day.items.forEach(i=>console.log("  10:",i.timeLabel,i.name,i.fitText,"|",i.warn));
// export
v.day.toCalendar();v=c.renderVals();console.log(v.exp.title,v.exp.countLabel,v.exp.primaryLabel,v.exp.fileName);v.exp.targets[1].pick();v=c.renderVals();console.log(v.exp.primaryLabel,v.exp.targetNote);console.log(v.exp.events[0].gHref.slice(0,160));
v.exp.scopes[1].pick();v=c.renderVals();console.log(v.exp.title,v.exp.countLabel);v.exp.download();v=c.renderVals();console.log(v.exp.doneTitle,"|",v.exp.doneNote);v.exp.close();
// add flow
v=c.renderVals();v.day.findIdeas();v=c.renderVals();console.log("add:",v.add.name,v.add.dateTitle,v.add.timeLabel,v.add.fitText,v.add.quick.map(q=>q.top+q.num+(q.blocked?"x":"")).join(" "));
c.setState({add:Object.assign({},c.state.add,{id:"carriageworks",date:"2026-10-04"})});v=c.renderVals();console.log("cw sun:",v.add.warn,v.add.canAdd,v.add.confirmLabel);
c.setState({add:Object.assign({},c.state.add,{id:"opera-tour",date:"2026-10-07",slot:"evening"})});v=c.renderVals();console.log("opera wed:",v.add.timeLabel,v.add.warn,v.add.confirmLabel);v.add.confirm();v=c.renderVals();console.log(v.add.doneTitle,v.day.items.map(x=>x.timeLabel+" "+x.name+" "+x.warn));
v.add.toCalendar();v=c.renderVals();console.log(v.exp.title,v.exp.scopes.map(x=>x.label+(x.selected?"*":"")).join(","),v.exp.countLabel);
v.nextMonth();v=c.renderVals();console.log(v.monthLabel,v.canNext);v.nextMonth();v.nextMonth();v=c.renderVals();console.log(v.monthLabel,v.canNext,v.weeks.map(w=>w.cells.filter(x=>x.isHoliday).map(x=>x.num+x.holiday).join("")).join(""));
// walk all states
for(const m of ["2026-09","2026-10","2026-11","2026-12"]){c.setState({month:m});const vv=c.renderVals();for(const w of vv.weeks)for(const cell of w.cells){cell.pick();walk(c.renderVals(),m+cell.date);}}
for(const id of Object.keys(c.ACTS)){c.setState({sheet:"add",add:{id,date:"2026-10-05",slot:"suggested",done:false}});walk(c.renderVals(),"add:"+id);}
console.log("problems",bad.length,bad.slice(0,8));

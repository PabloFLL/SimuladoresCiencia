(function(root,factory){const P=typeof module==='object'?require('./physics-2d.js'):root.Physics2D;const api=factory(P);if(typeof module==='object')module.exports=api;else root.Experiments2D=api;})(typeof globalThis!=='undefined'?globalThis:this,function(P){
 'use strict';
 class MolecularExperiment{
  constructor(params={}){this.params={N:36,W:18,H:12,T:1.3,sigma:1,attraction:1.2,seed:8251,...params};this.thermostat=true;this.reset();}
  reset(seed=this.params.seed){
   this.params.seed=seed;const p=P.prepare(this.params),{W,H,sigma,attraction}=this.params;
   this.A=new P.MolecularGas(p,W,H,{ideal:true,sigma});this.B=new P.MolecularGas(p,W,H,{sigma,attraction});
   this.targetW=W;this.steps=0;this.history=[];this.window=[];this.previous={ai:0,ae:0,bi:0,be:0};this.trailsA=[];this.trailsB=[];this.sample();
  }
  setTemperature(T){this.params.T=T;this.A.setTemperature(T);this.B.setTemperature(T);this.window=[];}
  setAttraction(value){this.params.attraction=value;this.B.setAttraction(value);this.window=[];}
  setWidth(W){this.targetW=W;this.params.W=W;}
  step(){
   const dt=.0005,u=Math.sign(this.targetW-this.A.W)*Math.min(.5,Math.abs(this.targetW-this.A.W)/dt),options={wallSpeed:u,thermostat:this.thermostat,T:this.params.T};
   this.A.step(dt,options);this.B.step(dt,options);this.steps++;
   if(this.steps%100===0){for(const [gas,trail]of [[this.A,this.trailsA],[this.B,this.trailsB]]){trail.push({x:gas.p[0].x,y:gas.p[0].y});if(trail.length>120)trail.shift();}}
   if(this.steps%500===0)this.sample();
  }
  sample(){
   const a=this.A.stats(),b=this.B.stats(),pr=this.previous;
   const entry={ai:this.A.impulse-pr.ai,ae:this.A.exposure-pr.ae,bi:this.B.impulse-pr.bi,be:this.B.exposure-pr.be};
   if(entry.ae>0){this.window.push(entry);if(this.window.length>12)this.window.shift();}
   this.previous={ai:this.A.impulse,ae:this.A.exposure,bi:this.B.impulse,be:this.B.exposure};
   const sum=key=>this.window.reduce((s,v)=>s+v[key],0),area=this.A.W*this.A.H;
   const point={t:this.steps*.0005,area,pa:sum('ae')?sum('ai')/sum('ae'):null,pb:sum('be')?sum('bi')/sum('be'):null,rawa:entry.ae?entry.ai/entry.ae:null,rawb:entry.be?entry.bi/entry.be:null,ta:a.T,tb:b.T,K:b.K,U:b.U,E:b.E,expected:this.B.initialE+this.B.work+this.B.heat,ea:a.E,ideal:this.params.N*a.T/area,vdw:P.eos(this.params.N,b.T,area,this.params.sigma,this.params.attraction).vdw,balance:b.balance};
   this.history.push(point);if(this.history.length>800)this.history.shift();this.latest=point;
  }
 }
 class ChaosExperiment{
  constructor(params={}){this.params={N:32,T:1,density:1/6,r:.5,angle:1e-6,selected:0,collisions:true,seed:123,...params};this.threshold=.05;this.perturbed=true;this.reset();}
  reset({seed=this.params.seed,perturbed=this.perturbed}={}){
   this.params.seed=seed;this.perturbed=perturbed;const {N,T,density,r,selected,angle,collisions}=this.params;
   this.W=Math.sqrt(N/density*4/3);this.H=this.W*3/4;
   const p=P.prepare({N,T,W:this.W,H:this.H,sigma:2*r,seed}),q=P.clone(p);if(perturbed)P.rotate(q,selected,angle);
   this.A=new P.HardGas(p,this.W,this.H,r,collisions);this.B=new P.HardGas(q,this.W,this.H,r,collisions);
   this.steps=0;this.time=0;this.trailsA=[{...p[selected],t:0}];this.trailsB=[{...q[selected],t:0}];this.history=[];this.window=[];this.crossing=null;this.finished=false;this.previous={ai:0,bi:0,ae:0,be:0};this.sample();
  }
  step(){
   if(this.finished)return;const dt=.04,index=this.params.selected;
   const flight=(gas,trail)=>(p,h)=>{if(h<=0)return;const q=p[index];trail.push({x:q.x,y:q.y,t:gas.t+h});while(trail.length>600||trail.length>1&&trail[0].t<this.time-8)trail.shift();};
   this.A.step(dt,flight(this.A,this.trailsA));this.B.step(dt,flight(this.B,this.trailsB));this.steps++;this.time=this.steps*dt;
   const d=P.separation(this.A.p,this.B.p,this.W,this.H);if(this.crossing===null&&d>=this.threshold)this.crossing=this.time;
   if(this.steps%5===0)this.sample();if(this.time>=160)this.finished=true;
  }
  setThreshold(value){this.threshold=value;this.crossing=this.history.find(p=>p.d>=value)?.t??null;}
  sample(){
   const pr=this.previous,entry={ai:this.A.impulse-pr.ai,ae:this.A.exposure-pr.ae,bi:this.B.impulse-pr.bi,be:this.B.exposure-pr.be};
   if(entry.ae>0){this.window.push(entry);if(this.window.length>20)this.window.shift();}this.previous={ai:this.A.impulse,ae:this.A.exposure,bi:this.B.impulse,be:this.B.exposure};
   const sum=key=>this.window.reduce((s,p)=>s+p[key],0),ea=P.kinetic(this.A.p),eb=P.kinetic(this.B.p);
   this.latest={t:this.time,d:P.separation(this.A.p,this.B.p,this.W,this.H),ta:ea/this.params.N,tb:eb/this.params.N,ea,eb,pa:sum('ae')?sum('ai')/sum('ae'):null,pb:sum('be')?sum('bi')/sum('be'):null};this.history.push(this.latest);
  }
 }
 return{MolecularExperiment,ChaosExperiment};
});

/* Three-dimensional ideal point gas in SI units. No rendering or frame-clock dependencies.
   Each visible point samples many molecules; its wall impulses carry an explicit weight. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.DaltonModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const R=8.31446261815324,NA=6.02214076e23,DT=2e-6;
 const species=[{name:'N₂',label:'Nitrógeno',M:.028,color:'#83bdff'},{name:'O₂',label:'Oxígeno',M:.032,color:'#f0a474'},{name:'Ar',label:'Argón',M:.040,color:'#bba2f4'},{name:'Trazas',label:'CO₂ y minoritarios',M:.044,color:'#b4c3c0'}];
 const airFractions=[.7808,.2095,.0093,.0004];
 function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return(s+.5)/4294967296;};}
 function amounts(n){if(!Array.isArray(n)||n.length!==4||n.some(v=>!Number.isFinite(v)||v<0||v>20))throw Error('Cantidades de gas no válidas.');return n.slice();}
 function theory(n,T,V,partition=false){
  amounts(n);if(!(Number.isFinite(T)&&T>0&&Number.isFinite(V)&&V>0))throw Error('Usa T y V positivos.');
  const totalN=n.reduce((a,b)=>a+b,0),partial=n.map(v=>v*R*T/(partition?V/2:V));
  return{partial,total:partition?null:partial.reduce((a,b)=>a+b,0),nTotal:totalN,x:n.map(v=>totalN?v/totalN:0),future:n.map(v=>v*R*T/V)};
 }
 class Mixture{
  constructor({n=[.4,0,0,0],T=300,V=10,seed=44621,partition=false,mode='add'}={}){
   this.n=amounts(n);if(!(T>=100&&T<=1000&&V>=1&&V<=150))throw Error('Preparación fuera de rango.');
   this.T=T;this.V=V;this.L=Math.cbrt(V*.001);this.seed=seed>>>0;this.partition=partition;this.mode=mode;
   if(partition&&(n[2]||n[3]))throw Error('La preparación dividida usa N₂ y O₂.');
   this.p=species.map(()=>[]);this.random=species.map((_,i)=>rng((this.seed^Math.imul(i+1,2654435761))>>>0));this.serial=[0,0,0,0];
   this.time=0;this.steps=0;this.impulses=[0,0,0,0];this.exposure=[0,0,0,0];this.hits=[];this.history=[];
   for(let i=0;i<4;i++)this.replaceAmount(i,n[i]);
   this.clearMeasurement();this.capture();this.initialLocal=partition?theory(this.n,T,V,true).partial.slice():null;
  }
  bounds(i){return this.partition?(i===0?[0,this.L/2]:[this.L/2,this.L]):[0,this.L];}
  replaceAmount(i,n){
   const count=n>0?Math.max(1,Math.min(80,Math.round(n/.01))):0,arr=this.p[i],random=this.random[i],s=species[i],sigma=Math.sqrt(R*this.T/s.M),[lo,hi]=this.bounds(i);
   while(arr.length>count)arr.pop();
   const normal=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
   while(arr.length<count){arr.push({id:this.serial[i]++,species:i,x:lo+(hi-lo)*random(),y:this.L*random(),z:this.L*random(),vx:sigma*normal(),vy:sigma*normal(),vz:sigma*normal(),trail:[]});}
   this.n[i]=n;
   if(count){
    // Condition the finite Gaussian sample to the correct three kinetic second moments.
    for(const axis of ['vx','vy','vz']){const moment=arr.reduce((sum,q)=>sum+q[axis]*q[axis],0)/count,f=Math.sqrt(R*this.T/s.M/moment);for(const q of arr)q[axis]*=f;}
    for(const q of arr){q.weight=n*NA/count;q.trail=[];}
   }
  }
  setAmount(i,n){if(!Number.isInteger(i)||i<0||i>3||!Number.isFinite(n)||n<0||n>20)throw Error('Cantidad no válida.');if(this.partition&&i>1&&n>0)throw Error('Retira primero la pared para añadir Ar.');this.replaceAmount(i,n);this.clearMeasurement();this.capture();}
  setAmounts(n){amounts(n);if(this.partition&&(n[2]||n[3]))throw Error('Preparación dividida incompatible.');for(let i=0;i<4;i++)this.replaceAmount(i,n[i]);this.clearMeasurement();this.capture();}
  setTemperature(T){if(!(Number.isFinite(T)&&T>=100&&T<=1000))throw Error('Temperatura fuera de rango.');const scale=Math.sqrt(T/this.T);for(const arr of this.p)for(const q of arr){q.vx*=scale;q.vy*=scale;q.vz*=scale;}this.T=T;this.clearMeasurement();this.capture();}
  setVolume(V){if(!(Number.isFinite(V)&&V>=1&&V<=150))throw Error('Volumen fuera de rango.');const next=Math.cbrt(V*.001),factor=next/this.L;for(const arr of this.p)for(const q of arr){q.x*=factor;q.y*=factor;q.z*=factor;q.trail=[];}this.L=next;this.V=V;this.hits=[];this.clearMeasurement();this.capture();}
  removePartition(){if(!this.partition)return;this.initialLocal=theory(this.n,this.T,this.V,true).partial.slice();this.initialMixV=this.V;this.initialMixT=this.T;this.partition=false;this.hits=[];this.clearMeasurement();this.capture();}
  clearMeasurement(){this.window=[];this.previousI=this.impulses.slice();this.previousE=this.exposure.slice();}
  step(dt=DT){
   if(!(dt>0&&dt<=.001&&Number.isFinite(dt)))throw Error('Paso temporal no válido.');
   for(let i=0;i<4;i++){
    const [lo,hi]=this.bounds(i),surface=2*((hi-lo)*this.L*2+this.L*this.L),m=species[i].M/NA;
    this.exposure[i]+=surface*dt;
    for(const [index,q]of this.p[i].entries()){
     let remaining=dt,elapsed=0,events=0;
     while(remaining>1e-15){
      if(++events>100)throw Error('Demasiados impactos en un paso.');
      let h=remaining,axis=null;
      for(const [position,velocity,min,max]of [['x','vx',lo,hi],['y','vy',0,this.L],['z','vz',0,this.L]]){
       const v=q[velocity];if(v===0)continue;const time=((v<0?min:max)-q[position])/v;
       if(time>=-1e-12&&time<h){h=Math.max(0,time);axis=velocity;}
      }
      q.x+=q.vx*h;q.y+=q.vy*h;q.z+=q.vz*h;elapsed+=h;remaining-=h;
      if(!axis)break;
      const impulse=2*m*q.weight*Math.abs(q[axis]);this.impulses[i]+=impulse;q[axis]=-q[axis];
      this.hits.push({i,x:q.x,y:q.y,z:q.z,t:this.time+elapsed,impulse});
     }
     if(this.steps%5===0&&index<3){q.trail.push({x:q.x,y:q.y,z:q.z});if(q.trail.length>80)q.trail.shift();}
    }
   }
   this.steps++;this.time+=dt;
   while(this.hits.length>256||this.hits.length&&this.time-this.hits[0].t>6e-5)this.hits.shift();
   if(this.steps%25===0)this.capture();
  }
  measured(){
   if(!this.window.length)return this.n.map(n=>n?null:0);
   return species.map((_,i)=>{const impulse=this.window.reduce((s,w)=>s+w.I[i],0),areaTime=this.window.reduce((s,w)=>s+w.E[i],0);return areaTime?impulse/areaTime/1000:0;});
  }
  capture(){
   const I=this.impulses.map((v,i)=>v-this.previousI[i]),E=this.exposure.map((v,i)=>v-this.previousE[i]);
   if(E[0]>0){this.window.push({I,E});if(this.window.length>40)this.window.shift();}
   this.previousI=this.impulses.slice();this.previousE=this.exposure.slice();
   const th=theory(this.n,this.T,this.V,this.partition),measured=this.measured();
   const totalMeasured=this.partition||measured.some(v=>v===null)?null:measured.reduce((a,b)=>a+b,0);
   this.latest={t:this.time*1000,partial:th.partial,total:th.total,measured,measuredTotal:totalMeasured,partition:this.partition};
   this.history.push(this.latest);if(this.history.length>600)this.history.shift();
  }
  stats(){
   const th=theory(this.n,this.T,this.V,this.partition);
   const rms=this.p.map(arr=>arr.length?Math.sqrt(arr.reduce((s,q)=>s+q.vx*q.vx+q.vy*q.vy+q.vz*q.vz,0)/arr.length):null);
   const energy=this.p.reduce((total,arr,i)=>total+arr.reduce((sum,q)=>sum+.5*species[i].M/NA*q.weight*(q.vx*q.vx+q.vy*q.vy+q.vz*q.vz),0),0);
   const surface=(this.partition?4:6)*this.L*this.L,averagingTime=this.window.reduce((sum,w)=>sum+w.E[0],0)/surface;
   return{...th,rms,energy,counts:this.p.map(arr=>arr.length),measured:this.measured(),averagingTime,time:this.time};
  }
 }
 function air(T=300,V=10,pressure=101.325,seed=44621){const total=pressure*V/(R*T);return new Mixture({T,V,n:airFractions.map(x=>x*total),seed,mode:'air'});}
 const presets={add:()=>new Mixture(),mix:()=>new Mixture({n:[.3,.3,0,0],partition:true,mode:'mix'}),masses:()=>new Mixture({n:[.3,0,.3,0],mode:'masses'}),air:()=>air()};
 const challenges=[
  {id:'oxygen',question:'Si duplicas el oxígeno a T y V constantes, ¿qué ocurre con su presión parcial?',n:[.2,.2,.1,0],options:['Se duplica','No cambia','Se reduce a la mitad']},
  {id:'argon',question:'Si añades nitrógeno a T y V constantes, ¿qué ocurre con la presión parcial del argón?',n:[.2,.2,.2,0],options:['Se duplica','No cambia','Se reduce a la mitad']},
  {id:'volume',question:'Si reduces V a la mitad manteniendo T, ¿qué ocurre con todas las presiones parciales?',n:[.2,.2,.1,0],options:['Se duplican','No cambian','Se reducen a la mitad']},
  {id:'mass',question:'Con iguales cantidades de N₂ y Ar a la misma T y V, ¿cuál ejerce mayor presión parcial?',n:[.3,0,.3,0],options:['La misma presión parcial','El nitrógeno','El argón']}
 ];
 function runChallenge(gas,id){
  const before=gas.stats();let key=0;
  if(id==='oxygen'){key=1;gas.setAmount(1,2*gas.n[1]);}
  else if(id==='argon'){key=2;gas.setAmount(0,gas.n[0]+.2);}
  else if(id==='volume')gas.setVolume(gas.V/2);
  else if(id!=='mass')throw Error('Reto desconocido.');
  const after=gas.stats();
  if(id==='mass'){const ratio=after.partial[0]/after.partial[2];return{before,after,key,answer:Math.abs(ratio-1)<1e-10?0:ratio>1?1:2,ratio};}
  const ratio=after.partial[key]/before.partial[key];return{before,after,key,ratio,answer:Math.abs(ratio-2)<1e-10?0:Math.abs(ratio-1)<1e-10?1:2};
 }
 return{R,NA,DT,species,airFractions,theory,Mixture,air,presets,challenges,runChallenge};
});

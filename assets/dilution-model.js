/* Dilution: mol, L, mol/L. Seeded 3D tracers; no DOM or rendering. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.DilutionModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const CAPACITY=2,PACKET=.005,DURATION=6,STEP=1/120,DEPTH=.75,HEIGHT=1.4;
 const copy=p=>p.map(q=>({...q})),height=V=>V/CAPACITY*HEIGHT;
 function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return(s+.5)/4294967296;};}
 function validate({n,V0,Vf}){if(![n,V0,Vf].every(Number.isFinite)||n<.05-1e-10||n>.5+1e-10||Math.abs(n/PACKET-Math.round(n/PACKET))>1e-8||V0<.25||V0>1.5||Vf<V0+.25-1e-10||Vf>CAPACITY)throw RangeError('Moles: 0,05–0,50; volumen inicial: 0,25–1,50 L; final: al menos 0,25 L mayor y hasta 2 L.');}
 function prepare(n,V,seed=177){const random=rng(seed),count=Math.round(n/PACKET),H=height(V);return Array.from({length:count},(_,id)=>{const cos=2*random()-1,angle=random()*2*Math.PI,sin=Math.sqrt(1-cos*cos),speed=.65+.3*random();return{id,x:random(),y:random()*H,z:random()*DEPTH,vx:speed*sin*Math.cos(angle),vy:speed*cos,vz:speed*sin*Math.sin(angle)};});}
 function advance(p,H,dt){for(const q of p)for(const [key,vkey,max] of [['x','vx',1],['y','vy',H],['z','vz',DEPTH]]){q[key]+=q[vkey]*dt;/* Continuous flights and specular confinement. No position re-randomization or rescaling. */while(q[key]<0||q[key]>max){if(q[key]<0){q[key]=-q[key];q[vkey]=Math.abs(q[vkey]);}if(q[key]>max){q[key]=2*max-q[key];q[vkey]=-Math.abs(q[vkey]);}}}}
 class Solution{
  constructor(config={}){this.reset({n:.2,V0:.5,Vf:1,...config});}
  reset(config=this.config){validate(config);this.config=Object.freeze({...config});this.n=config.n;this.V0=config.V0;this.Vf=config.Vf;this.V=this.V0;this.elapsed=0;this.time=0;this.started=false;this.finished=false;this.playing=true;this.p=prepare(this.n,this.V0);this.before=copy(this.p);}
  configure(config){if(this.started)throw Error('Reinicia antes de preparar otra disolución.');const playing=this.playing;this.reset({...this.config,...config});this.playing=playing;}
  start(){if(this.started)return false;this.before=copy(this.p);this.started=true;this.playing=true;return true;}
  step(dt=STEP){if(!(Number.isFinite(dt)&&dt>0&&dt<=.05))throw RangeError('Paso temporal no válido.');if(!this.playing)return;this.time+=dt;if(this.started&&!this.finished){this.elapsed=Math.min(DURATION,this.elapsed+dt);this.V=this.V0+(this.Vf-this.V0)*this.elapsed/DURATION;if(this.elapsed>=DURATION-1e-10){this.elapsed=DURATION;this.V=this.Vf;this.finished=true;}}
   advance(this.p,height(this.V),dt);advance(this.before,height(this.V0),dt);
  }
  stats(){return{n:this.n,V:this.V,M:this.n/this.V,V0:this.V0,Vf:this.Vf,M0:this.n/this.V0,count:this.p.length,beforeCount:this.before.length,packet:PACKET,progress:this.elapsed/DURATION,started:this.started,finished:this.finished,flowing:this.started&&!this.finished};}
 }
 return{CAPACITY,PACKET,DURATION,STEP,DEPTH,HEIGHT,height,prepare,advance,validate,Solution};
});

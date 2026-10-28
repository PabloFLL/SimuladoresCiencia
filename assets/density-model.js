/* Independent calculations and deterministic teaching models; no DOM or rendering. */
(function(root){
'use strict';const data=typeof module!=='undefined'?require('./density-data.js'):root.DensityData,M=data.materials;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function positive(v,name){if(!Number.isFinite(v)||v<=0)throw RangeError(name+' debe ser positivo.');return v;}
function sample(id,quantity=1000,mode='volume'){const m=M[id];if(!m)throw RangeError('Material desconocido');positive(quantity,'Cantidad');if(!['volume','mass'].includes(mode))throw RangeError('Comparación desconocida');const volume=mode==='volume'?quantity:quantity/m.rho,mass=mode==='mass'?quantity:quantity*m.rho;return {...m,mass,volume,density:mass/volume};}
function comparison(ids,quantity,mode){return ids.map(id=>sample(id,quantity,mode));}
const liquidTable=[[0,.99984],[20,.9982],[40,.9922],[60,.9832],[80,.9718],[100,.9584]];
function waterDensity(T){T=clamp(T,0,100);let i=0;while(i<liquidTable.length-2&&T>liquidTable[i+1][0])i++;const [a,r]=liquidTable[i],[b,s]=liquidTable[i+1];return r+(s-r)*(T-a)/(b-a);}
function waterState(mass,heat){positive(mass,'Masa');heat=clamp(heat,0,100);let T,ice=0,liquid=0,vapor=0,phase;
 if(heat<20){T=0;ice=1-heat/20;liquid=1-ice;phase=heat===0?'Hielo a 0 °C':'Fusión a 0 °C';}
 else if(heat<=45){T=(heat-20)*4;liquid=1;phase='Agua líquida';}
 else{T=100;vapor=(heat-45)/55;liquid=1-vapor;phase=heat===100?'Vapor a 100 °C':'Ebullición a 100 °C';}
 const volumes={ice:mass*ice/.917,liquid:mass*liquid/waterDensity(T),vapor:mass*vapor/.000598};const volume=Object.values(volumes).reduce((a,b)=>a+b,0);
 return {id:'water',name:phase,mass,volume,density:mass/volume,T,P:101.4,ice,liquid,vapor,volumes,heat};
}
function airState(volume,T=20){positive(volume,'Volumen');if(volume<250||volume>2000||T<0||T>80||!Number.isFinite(T))throw RangeError('Fuera del intervalo del modelo');const mass=1.2,P=101.325*1000/volume*(T+273.15)/293.15;return {id:'air',name:'Aire seco',mass,volume,density:mass/volume,T,P};}
function compressedReference(P){if(!Number.isFinite(P)||P<=0||P>600)throw RangeError('Presión fuera de intervalo');const delta=(P-101.325)*1000;return [{id:'air',volume:1000*101.325/P},{id:'water',volume:1000*(1-delta/2.2e9)},{id:'iron',volume:1000*(1-delta/170e9)}];}
function fragments(id,totalVolume,parts){if(![1,2,4].includes(parts))throw RangeError('División no permitida');const total=sample(id,totalVolume);return {total,parts,fragment:sample(id,total.volume/parts)};}
function displacement(volume,initial=50){positive(volume,'Volumen');if(volume>45||initial<0||initial+volume>100)throw RangeError('La muestra no cabe en la probeta');return {initial,final:initial+volume,volume};}
function checkMeasurement({mass,initial,final,density},actual){if(![mass,initial,final,density].every(Number.isFinite)||mass<=0||initial<0||final<=initial||final>100||density<=0)return {ok:false,message:'Introduce una masa positiva y un nivel final mayor que el inicial (hasta 100 mL).'};const volume=final-initial,calculated=mass/volume,close=(a,b,t)=>Math.abs(a-b)<=t;const measured=close(mass,actual.mass,.11)&&close(initial,actual.initial,.11)&&close(final,actual.final,.11),division=close(density,calculated,Math.max(.015,.01*calculated));return {ok:measured&&division,volume,calculated,message:!measured?'Revisa las lecturas de la balanza y de la probeta.':!division?'El volumen es nivel final − nivel inicial. Divide después la masa entre ese volumen.':'Medidas y cálculo coherentes. Compara tu resultado con la tabla.'};}
function buoyancy(id,fluid='water',volume=100){const a=sample(id,volume),rho=M[fluid]?.rho;if(!rho||M[fluid].state!=='líquido')throw RangeError('Fluido no válido');return {...a,fluid,fluidDensity:rho,fraction:Math.min(1,a.density/rho),floats:a.density<rho,neutral:Math.abs(a.density-rho)<1e-12,weight:a.mass/1000*9.81,maxBuoyancy:rho*volume/1000*9.81};}
class FloatBody{
 constructor(id='ice',fluid='water',volume=100){this.info=buoyancy(id,fluid,volume);this.h=Math.cbrt(volume)*.01;this.depth=.28;this.y=-this.h*1.6;this.v=0;this.released=false;this.time=0;this.forces();}
 forces(){const f=clamp((this.y+this.h)/this.h,0,1);this.submerged=f;this.weight=this.info.weight;this.upthrust=this.info.maxBuoyancy*f;return this.upthrust;}
 release(){this.released=true;}
 step(dt){if(!this.released)return;dt=clamp(dt,0,.05);const n=Math.ceil(dt/.002);for(let i=0;i<n;i++){const h=dt/n;this.forces();const m=this.info.mass/1000;/* Damped translation. Drag vanishes at rest. */const drag=-m*(this.submerged>0?9:0.1)*this.v;this.v+=(this.weight-this.upthrust+drag)/m*h;this.y+=this.v*h;if(this.y+this.h>=this.depth){this.y=this.depth-this.h;this.v=0;}this.time+=h;}this.forces();}
}
function iceSites(){const unique=new Map();for(let i=0;i<4;i++)for(let j=0;j<3;j++)for(let k=0;k<6;k++){const x=1.5*i+Math.cos(k*Math.PI/3),y=Math.sqrt(3)*(j+(i%2)/2)+Math.sin(k*Math.PI/3);unique.set(x.toFixed(5)+','+y.toFixed(5),{x,y});}const p=[...unique.values()].slice(0,36),xmin=Math.min(...p.map(q=>q.x)),ymin=Math.min(...p.map(q=>q.y)),range=Math.max(Math.max(...p.map(q=>q.x))-xmin,Math.max(...p.map(q=>q.y))-ymin);return p.map(q=>({x:.055+(q.x-xmin)/range*.72,y:.055+(q.y-ymin)/range*.72}));}
function rng(seed){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};}
class MicroBox{
 constructor(state='gas',seed=17){this.state=state;this.t=0;const random=rng(seed);this.N=36;this.L=state==='gas'?1:state==='ice'?.83:.72;this.radius=state==='gas'?.009:state==='ice'?.024:.038;const sites=state==='ice'?iceSites():null;this.p=[];for(let i=0;i<this.N;i++){let x,y;if(state==='ice'){x=sites[i].x;y=sites[i].y;}else{x=.07+(i%6)*(this.L-.14)/5;y=.07+Math.floor(i/6)*(this.L-.14)/5;}const angle=random()*Math.PI*2,speed=state==='gas'?.27:.075;this.p.push({x,y,x0:x,y0:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,phase:random()*6.28});}}
 step(dt){dt=clamp(dt,0,.03);this.t+=dt;if(this.state==='solid'||this.state==='ice'){for(const p of this.p){p.x=p.x0+.007*Math.sin(this.t*8+p.phase);p.y=p.y0+.007*Math.cos(this.t*9+p.phase);}return;}const r=this.radius,L=this.L;for(const p of this.p){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.x<r){p.x=2*r-p.x;p.vx=Math.abs(p.vx);}if(p.x>L-r){p.x=2*(L-r)-p.x;p.vx=-Math.abs(p.vx);}if(p.y<r){p.y=2*r-p.y;p.vy=Math.abs(p.vy);}if(p.y>L-r){p.y=2*(L-r)-p.y;p.vy=-Math.abs(p.vy);}}
 if(this.state==='liquid')for(let i=0;i<this.N;i++)for(let j=i+1;j<this.N;j++){const a=this.p[i],b=this.p[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>0&&d<2*r){const nx=dx/d,ny=dy/d,u=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(u<0){a.vx+=u*nx;a.vy+=u*ny;b.vx-=u*nx;b.vy-=u*ny;}const overlap=(2*r-d)/2+1e-7;a.x=clamp(a.x-overlap*nx,r,L-r);a.y=clamp(a.y-overlap*ny,r,L-r);b.x=clamp(b.x+overlap*nx,r,L-r);b.y=clamp(b.y+overlap*ny,r,L-r);}}
 }
}
class AirParticles{
 constructor(volume=1000,T=20){const rand=rng(61);this.W=1;this.H=volume/1000;this.T=T;this.p=Array.from({length:36},()=>{const angle=rand()*Math.PI*2;return {x:.02+rand()*.96,y:(.02+rand()*.96)*this.H,vx:.5*Math.cos(angle),vy:.5*Math.sin(angle)};});}
 prepare(volume,T){const H=volume/1000,f=Math.sqrt((T+273.15)/(this.T+273.15));for(const p of this.p){p.y*=H/this.H;p.vx*=f;p.vy*=f;}this.H=H;this.T=T;}
 step(dt){dt=clamp(dt,0,.03);for(const p of this.p){p.x+=p.vx*dt;p.y+=p.vy*dt;for(const [key,vkey,L] of [['x','vx',this.W],['y','vy',this.H]]){if(p[key]<0){p[key]=-p[key];p[vkey]=Math.abs(p[vkey]);}if(p[key]>L){p[key]=2*L-p[key];p[vkey]=-Math.abs(p[vkey]);}}}}
}
const api={sample,comparison,waterState,waterDensity,airState,compressedReference,fragments,displacement,checkMeasurement,buoyancy,FloatBody,MicroBox,AirParticles,clamp,units:{gToKg:v=>v/1000,cm3ToL:v=>v/1000,gCm3ToKgM3:v=>v*1000}};root.DensityModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

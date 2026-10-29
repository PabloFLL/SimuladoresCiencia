/* Equal-mass spheres in equal 3D volumes. Reduced, illustrative units; no DOM. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.StatesModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const RADIUS=.057,COUNTS=Object.freeze({solid:512,liquid:450,gas:2}),STEP=.0015;
 function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return(s+.5)/4294967296;};}
 function energy(p){return p.reduce((sum,q)=>sum+.5*(q.vx*q.vx+q.vy*q.vy+q.vz*q.vz),0);}
 function lattice(){const p=[],r=RADIUS+.0045;for(let z=0;z<8;z++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)p.push({x:r+(1-2*r)*x/7,y:r+(1-2*r)*y/7,z:r+(1-2*r)*z/7});return p;}
 function stats(world){return {count:world.p.length,volume:1,mass:world.p.length,particleMass:1,radius:RADIUS,density:world.p.length,relative:world.p.length/COUNTS.solid};}
 function elasticPair(a,b,nx,ny,nz){const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny+(b.vz-a.vz)*nz;if(relative>=0)return false;a.vx+=relative*nx;a.vy+=relative*ny;a.vz+=relative*nz;b.vx-=relative*nx;b.vy-=relative*ny;b.vz-=relative*nz;return true;}
 class Fluid{
  constructor(state='liquid',seed=8401){if(!['liquid','gas'].includes(state))throw RangeError('Estado desconocido.');this.state=state;this.t=0;this.collisions=0;this.wallHits=0;this.p=[];this.r=RADIUS;const random=rng(seed),sites=lattice();for(let i=sites.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[sites[i],sites[j]]=[sites[j],sites[i]];}
   const N=COUNTS[state],speed=state==='gas'?.9:.36;for(let i=0;i<N;i++){const a=sites[i],cos=2*random()-1,phi=2*Math.PI*random(),sin=Math.sqrt(1-cos*cos);this.p.push({...a,vx:speed*sin*Math.cos(phi),vy:speed*sin*Math.sin(phi),vz:speed*cos});}
   if(state==='liquid'){for(let i=0;i<900;i++)this.step();this.t=0;this.collisions=0;this.wallHits=0;}
  }
  walls(q){const r=this.r;for(const [axis,v] of [['x','vx'],['y','vy'],['z','vz']]){if(q[axis]<r){q[axis]=2*r-q[axis];if(q[v]<0){q[v]=-q[v];this.wallHits++;}}else if(q[axis]>1-r){q[axis]=2*(1-r)-q[axis];if(q[v]>0){q[v]=-q[v];this.wallHits++;}}}}
  buckets(){const size=2*this.r,n=Math.ceil(1/size),grid=new Array(n*n*n);for(let i=0;i<this.p.length;i++){const q=this.p[i],x=Math.max(0,Math.min(n-1,Math.floor(q.x/size))),y=Math.max(0,Math.min(n-1,Math.floor(q.y/size))),z=Math.max(0,Math.min(n-1,Math.floor(q.z/size))),key=x+n*y+n*n*z;(grid[key]||(grid[key]=[])).push(i);}return {grid,n,size};}
  step(dt=STEP){if(!(dt>0&&dt<=STEP&&Number.isFinite(dt)))throw RangeError('Paso fuera del dominio.');const p=this.p,d=2*this.r,d2=d*d;for(const q of p){q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;this.walls(q);}
   // Spatial broad phase; short substeps + contact projection. No stochastic kicks.
   for(let iteration=0;iteration<4;iteration++){const {grid,n,size}=this.buckets();let overlaps=0;for(let i=0;i<p.length;i++){const a=p[i],cx=Math.floor(a.x/size),cy=Math.floor(a.y/size),cz=Math.floor(a.z/size);for(let z=Math.max(0,cz-1);z<=Math.min(n-1,cz+1);z++)for(let y=Math.max(0,cy-1);y<=Math.min(n-1,cy+1);y++)for(let x=Math.max(0,cx-1);x<=Math.min(n-1,cx+1);x++){const list=grid[x+n*y+n*n*z];if(!list)continue;for(const j of list){if(j<=i)continue;const b=p[j],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,rr=dx*dx+dy*dy+dz*dz;if(rr>=d2||rr<1e-20)continue;const distance=Math.sqrt(rr),nx=dx/distance,ny=dy/distance,nz=dz/distance;if(elasticPair(a,b,nx,ny,nz))this.collisions++;const correction=(d-distance+1e-10)/2;a.x-=correction*nx;a.y-=correction*ny;a.z-=correction*nz;b.x+=correction*nx;b.y+=correction*ny;b.z+=correction*nz;overlaps++;}}}for(const q of p)this.walls(q);if(!overlaps)break;}
   this.t+=dt;
  }
 }
 class Solid{
  constructor(seed=119){this.state='solid';this.t=0;this.r=RADIUS;const random=rng(seed);this.p=lattice().map(q=>({...q,x0:q.x,y0:q.y,z0:q.z,phase:random()*Math.PI*2,omega:10+random()*4,vx:0,vy:0,vz:0}));this.step(0);}
  step(dt=STEP){if(!(dt>=0&&dt<=STEP&&Number.isFinite(dt)))throw RangeError('Paso fuera del dominio.');this.t+=dt;const A=.0038;for(const q of this.p){for(const [axis,v,phase] of [['x','vx',0],['y','vy',2.1],['z','vz',4.2]]){const theta=q.omega*this.t+q.phase+phase;q[axis]=q[axis+'0']+A*Math.sin(theta);q[v]=A*q.omega*Math.cos(theta);}}}
 }
 class Laboratory{
  constructor(){this.worlds=[new Solid(),new Fluid('liquid'),new Fluid('gas',928)];this.ticks=0;this.history=[[],[],[]];this.sampleTrail();}
  step(){for(const world of this.worlds)world.step();this.ticks++;if(this.ticks%5===0)this.sampleTrail();}
  sampleTrail(){for(let i=0;i<3;i++){const world=this.worlds[i];/* Two marked, persistent identities. */if(!this.history[i].length)this.history[i]=[[],[]];for(let j=0;j<2;j++){const p=world.p[j];this.history[i][j].push({x:p.x,y:p.y,z:p.z});if(this.history[i][j].length>180)this.history[i][j].shift();}}}
  clearTrails(){this.history=[[],[],[]];this.sampleTrail();}
 }
 return {RADIUS,COUNTS,STEP,rng,lattice,energy,stats,elasticPair,Fluid,Solid,Laboratory};
});

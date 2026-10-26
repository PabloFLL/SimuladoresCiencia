/* Deterministic mechanics in reduced 2D units: mass = kB = reference energy = 1.
   No DOM, clock or rendering dependencies. Usable in browsers and Node tests. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.Physics2D=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return(s+.5)/4294967296;};}
 const clone=p=>p.map(q=>({...q}));
 function kinetic(p){return p.reduce((k,q)=>k+.5*(q.vx*q.vx+q.vy*q.vy),0);}
 function temperature(p){return kinetic(p)/p.length;}
 function rescale(p,T){if(!(T>0))throw Error('Temperatura no válida.');const before=kinetic(p),f=Math.sqrt(p.length*T/before);for(const q of p){q.vx*=f;q.vy*=f;}return kinetic(p)-before;}
 function prepare({N=36,W=18,H=12,T=1.4,sigma=1,seed=8251}={}){
  if(!Number.isInteger(N)||N<2||N>96||![W,H,T,sigma].every(Number.isFinite)||Math.min(W,H,T,sigma)<=0)throw Error('Preparación no válida.');
  const random=rng(seed),cols=Math.ceil(Math.sqrt(N*W/H)),rows=Math.ceil(N/cols),dx=(W-sigma)/cols,dy=(H-sigma)/rows;
  if(Math.min(dx,dy)<1.14*sigma)throw Error('Demasiadas partículas para este tamaño y recipiente.');
  const sites=Array.from({length:cols*rows},(_,i)=>i);
  for(let i=sites.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[sites[i],sites[j]]=[sites[j],sites[i]];}
  const p=Array.from({length:N},(_,i)=>{const cell=sites[i],a=2*Math.PI*random(),r=Math.sqrt(-2*Math.log(random()));return{x:sigma/2+(cell%cols+.5+(random()-.5)*.1)*dx,y:sigma/2+(Math.floor(cell/cols)+.5+(random()-.5)*.1)*dy,vx:r*Math.cos(a),vy:r*Math.sin(a)};});
  const mx=p.reduce((a,q)=>a+q.vx,0)/N,my=p.reduce((a,q)=>a+q.vy,0)/N;
  for(const q of p){q.vx-=mx;q.vy-=my;}rescale(p,T);return p;
 }
 function rotate(p,index,angle){const q=p[index];if(!q||!Number.isFinite(angle))throw Error('Perturbación no válida.');const c=Math.cos(angle),s=Math.sin(angle),vx=q.vx,vy=q.vy;q.vx=c*vx-s*vy;q.vy=s*vx+c*vy;}
 // Exact free flights and binary elastic collision events. Ordering breaks exact ties deterministically.
 class HardGas{
  constructor(p,W,H,r=.45,collisions=true){this.p=clone(p);this.W=W;this.H=H;this.r=r;this.collisions=collisions;this.t=0;this.impulse=0;this.exposure=0;this.hits=0;this.pairs=0;}
  step(duration,onFlight){
   if(!(duration>=0&&Number.isFinite(duration)))throw Error('Paso temporal no válido.');
   let left=duration,events=0;const p=this.p,r=this.r;
   while(left>1e-13){
    if(++events>10000)throw Error('Exceso de eventos: reduce la densidad.');
    let dt=left,hit=null;
    const offer=(time,event)=>{if(time>=-1e-11&&time<dt-1e-13){dt=Math.max(0,time);hit=event;}};
    for(let i=0;i<p.length;i++){
     const q=p[i];
     if(q.vx<0)offer((r-q.x)/q.vx,{i,axis:'x'});else if(q.vx>0)offer((this.W-r-q.x)/q.vx,{i,axis:'x'});
     if(q.vy<0)offer((r-q.y)/q.vy,{i,axis:'y'});else if(q.vy>0)offer((this.H-r-q.y)/q.vy,{i,axis:'y'});
    }
    if(this.collisions)for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
     const dx=p[i].x-p[j].x,dy=p[i].y-p[j].y,vx=p[i].vx-p[j].vx,vy=p[i].vy-p[j].vy,b=dx*vx+dy*vy;
     if(b>=-1e-13)continue;
     const a=vx*vx+vy*vy,c=dx*dx+dy*dy-4*r*r,D=b*b-a*c;
     if(D>1e-14&&a>1e-20){const time=c>0?c/(-b+Math.sqrt(D)):0;offer(time,{i,j});}
    }
    for(const q of p){q.x+=q.vx*dt;q.y+=q.vy*dt;}
    if(onFlight)onFlight(p,dt);
    left-=dt;this.t+=dt;this.exposure+=2*(this.W+this.H)*dt;
    if(!hit)break;
    const q=p[hit.i];
    if(hit.axis){const v=hit.axis==='x'?'vx':'vy';this.impulse+=2*Math.abs(q[v]);q[v]=-q[v];this.hits++;}
    else{
     const other=p[hit.j],dx=q.x-other.x,dy=q.y-other.y,rr=dx*dx+dy*dy,projection=((q.vx-other.vx)*dx+(q.vy-other.vy)*dy)/rr;
     if(projection<0){q.vx-=projection*dx;q.vy-=projection*dy;other.vx+=projection*dx;other.vy+=projection*dy;this.pairs++;}
    }
   }
  }
 }
 // WCA core of fixed strength + adjustable attractive LJ tail. Both U and force vanish at rc.
 function potential(r,sigma=1,attraction=1){
  const rc=2.5*sigma;if(r>=rc)return{U:0,F:0};
  if(!(r>.4*sigma))throw Error('Separación molecular extrema: ensayo detenido.');
  const rm=Math.pow(2,1/6)*sigma;
  const lj=(d)=>{const s6=Math.pow(sigma/d,6);return{U:4*(s6*s6-s6),F:24*(2*s6*s6-s6)/d};};
  const cut=lj(rc),v=lj(r);
  const rawU=r<rm?v.U+1-attraction:attraction*v.U,rawF=r<rm?v.F:attraction*v.F,Fc=attraction*cut.F;
  return{U:rawU-attraction*cut.U+(r-rc)*Fc,F:rawF-Fc};
 }
 const fieldCache=new Map();
 function meanField(sigma,attraction){
  // b = half the excluded disk area. a = -pi integral_sigma^rc U_attractive(r) r dr,
  // a low-density g(r)=step(r-sigma) estimate, not an EOS fitted to this finite MD gas.
  const key=sigma+':'+attraction;if(fieldCache.has(key))return fieldCache.get(key);
  const count=512,dr=1.5*sigma/count;let integral=0;
  for(let i=0;i<=count;i++){const r=sigma+i*dr,u=potential(r,sigma,attraction).U-potential(r,sigma,0).U;integral+=(i===0||i===count?.5:1)*u*r;}
  const value={a:-Math.PI*integral*dr,b:Math.PI*sigma*sigma/2};if(fieldCache.size>256)fieldCache.clear();fieldCache.set(key,value);return value;
 }
 function eos(N,T,A,sigma=1,attraction=1){const {a,b}=meanField(sigma,attraction);return{ideal:N*T/A,vdw:A>N*b?N*T/(A-N*b)-a*(N/A)**2:NaN,a,b};}
 class MolecularGas{
  constructor(p,W,H,{sigma=1,attraction=1,ideal=false}={}){
   this.p=clone(p);this.W=W;this.H=H;this.sigma=sigma;this.attraction=attraction;this.ideal=ideal;this.t=0;this.impulse=0;this.exposure=0;this.work=0;this.heat=0;this.hits=0;this.force();this.initialE=kinetic(this.p)+this.U;
  }
  force(){
   for(const q of this.p){q.fx=0;q.fy=0;}let U=0;
   if(!this.ideal)for(let i=0;i<this.p.length;i++)for(let j=i+1;j<this.p.length;j++){
    const q=this.p[i],s=this.p[j],dx=q.x-s.x,dy=q.y-s.y,rr=dx*dx+dy*dy;
    if(rr>=6.25*this.sigma*this.sigma)continue;
    const r=Math.sqrt(rr),v=potential(r,this.sigma,this.attraction),fx=v.F*dx/r,fy=v.F*dy/r;
    q.fx+=fx;q.fy+=fy;s.fx-=fx;s.fy-=fy;U+=v.U;
   }
   this.U=U;
  }
  setAttraction(value){const before=this.U;this.attraction=value;this.force();this.work+=this.U-before;}
  setTemperature(T){this.heat+=rescale(this.p,T);}
  step(dt,{wallSpeed=0,thermostat=false,T=1,tau=.5}={}){
   if(!(dt>0&&dt<=.005&&Number.isFinite(dt)))throw Error('Paso molecular no válido.');
   const oldW=this.W,newW=oldW+wallSpeed*dt,r=this.ideal?0:this.sigma/2;
   if(newW<3*this.sigma)throw Error('Recipiente demasiado estrecho.');
   for(const q of this.p){
    q.vx+=.5*q.fx*dt;q.vy+=.5*q.fy*dt;
    // Drift to exact moving-wall events, with v_after = 2*u_wall - v_before.
    let remaining=dt,elapsed=0,count=0;
    while(remaining>1e-14){
     if(++count>16)throw Error('Velocidad excesiva: ensayo detenido.');
     let h=remaining,axis=null,speed=0;
     const offer=(t,a,u=0)=>{if(t>=-1e-10&&t<h){h=Math.max(0,t);axis=a;speed=u;}};
     if(q.vx<0)offer((r-q.x)/q.vx,'x');
     if(q.vx>wallSpeed)offer((oldW+wallSpeed*elapsed-r-q.x)/(q.vx-wallSpeed),'x',wallSpeed);
     if(q.vy<0)offer((r-q.y)/q.vy,'y');else if(q.vy>0)offer((this.H-r-q.y)/q.vy,'y');
     q.x+=q.vx*h;q.y+=q.vy*h;remaining-=h;elapsed+=h;
     if(!axis)break;
     const key=axis==='x'?'vx':'vy',before=q[key],after=2*speed-before;
     q[key]=after;this.work+=.5*(after*after-before*before);this.impulse+=Math.abs(after-before);this.hits++;
    }
   }
   this.W=newW;this.force();
   for(const q of this.p){q.vx+=.5*q.fx*dt;q.vy+=.5*q.fy*dt;if(![q.x,q.y,q.vx,q.vy].every(Number.isFinite))throw Error('Estado numérico no válido.');}
   if(thermostat){const current=temperature(this.p),target=current+(T-current)*(1-Math.exp(-dt/tau));this.heat+=rescale(this.p,target);}
   this.t+=dt;this.exposure+=2*((oldW+newW)/2+this.H)*dt;
  }
  stats(){const K=kinetic(this.p),E=K+this.U;return{K,U:this.U,E,T:K/this.p.length,balance:E-this.initialE-this.work-this.heat};}
 }
 function separation(a,b,W,H){return Math.sqrt(a.reduce((s,p,i)=>s+(p.x-b[i].x)**2+(p.y-b[i].y)**2,0)/a.length)/Math.hypot(W,H);}
 function growth(data){
  const valid=data.filter(p=>p.d>1e-11&&p.d<.12).slice(-70);if(valid.length<20)return null;
  const first=valid[0],last=valid.at(-1);if(last.d/first.d<4||last.t-first.t<1)return null;
  const n=valid.length,mx=valid.reduce((s,p)=>s+p.t,0)/n,my=valid.reduce((s,p)=>s+Math.log(p.d),0)/n;
  let xx=0,xy=0,yy=0;for(const p of valid){const x=p.t-mx,y=Math.log(p.d)-my;xx+=x*x;xy+=x*y;yy+=y*y;}
  const slope=xy/xx,r2=xy*xy/(xx*yy);return slope>0&&r2>.95?{slope,r2,start:first.t,end:last.t}:null;
 }
 return{rng,clone,prepare,kinetic,temperature,rescale,rotate,HardGas,potential,meanField,eos,MolecularGas,separation,growth};
});

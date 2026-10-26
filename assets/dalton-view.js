/* Projection of actual 3D coordinates and independent scientific chart views. */
(function(root){
 'use strict';const D=DaltonModel,plotColors=['#3279ad','#b56636','#8058ae','#66827b'];
 function draw(canvas,gas,{filter='all',hitFilter='all',trails=false,impacts=true}={}){
  const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,L=gas.L,referenceL=Math.max(L,Math.cbrt(.01)),scale=Math.min((W-95)/(1.36*referenceL),(H-110)/(1.22*referenceL));
  const project=p=>[W/2+scale*(p.x-L/2+.36*(p.z-L/2)),H/2-scale*(p.y-L/2+.22*(p.z-L/2))];
  const path=points=>{c.beginPath();points.forEach((p,i)=>{const [x,y]=project(p);i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();};
  const point=(x,y,z)=>({x,y,z}),face=z=>[point(0,0,z),point(L,0,z),point(L,L,z),point(0,L,z)];
  c.clearRect(0,0,W,H);c.fillStyle='#142e36';c.fillRect(0,0,W,H);c.lineWidth=1.4;
  path(face(L));c.fillStyle='#1b3c45';c.fill();c.strokeStyle='#4b727c';c.stroke();
  path([point(0,0,0),point(L,0,0),point(L,0,L),point(0,0,L)]);c.fillStyle='#24454b';c.fill();c.stroke();
  for(const [x,y]of [[0,0],[L,0],[L,L],[0,L]]){const a=project(point(x,y,0)),b=project(point(x,y,L));c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
  if(gas.partition){path([point(L/2,0,0),point(L/2,L,0),point(L/2,L,L),point(L/2,0,L)]);c.fillStyle='#e4edec22';c.fill();c.strokeStyle='#b4d5d0';c.setLineDash([7,6]);c.stroke();c.setLineDash([]);c.fillStyle='#c9dfda';c.font='16px system-ui';c.textAlign='center';for(const [fraction,label]of [[.25,'N₂ · V/2'],[.75,'O₂ · V/2']]){const [x,y]=project(point(L*fraction,L*.94,L/2));c.fillText(label,x,y);}c.textAlign='left';}
  const visible=i=>filter==='all'||Number(filter)===i;
  for(let i=0;i<4;i++)if(visible(i)&&trails)for(const q of gas.p[i])if(q.trail.length>1){c.beginPath();q.trail.forEach((p,j)=>{const [x,y]=project(p);j?c.lineTo(x,y):c.moveTo(x,y);});c.strokeStyle=D.species[i].color;c.lineWidth=1.2;c.globalAlpha=.36;c.stroke();c.globalAlpha=1;}
  const ordered=gas.p.flat().filter(q=>visible(q.species)).sort((a,b)=>b.z-a.z);
  for(const q of ordered){const [x,y]=project(q),depth=q.z/L;c.globalAlpha=.72+.28*(1-depth);c.fillStyle=D.species[q.species].color;c.beginPath();c.arc(x,y,4.1+(1-depth)*1.3,0,Math.PI*2);c.fill();c.globalAlpha=1;}
  path(face(0));c.strokeStyle='#88abae';c.lineWidth=1.7;c.stroke();
  if(impacts)for(const hit of gas.hits)if(hitFilter==='all'||Number(hitFilter)===hit.i){
   const fade=Math.max(0,1-(gas.time-hit.t)/6e-5);if(!fade)continue;const [x,y]=project(hit);c.strokeStyle=D.species[hit.i].color;c.globalAlpha=fade;c.lineWidth=2;c.beginPath();c.arc(x,y,5+(1-fade)*9,0,Math.PI*2);c.stroke();c.globalAlpha=1;
  }
  c.fillStyle='#b1cdcb';c.font='13px system-ui';c.fillText('Movimiento 3D · Encuadre ajustado · Moléculas sin escala',25,H-22);
  if(filter!=='all'){c.fillStyle=D.species[Number(filter)].color;c.fillText('Filtro visual: '+D.species[Number(filter)].name+' · los demás siguen en el motor',25,29);}
 }
 class Charts{
  constructor(svg,legend,readout,note){this.svg=svg;this.legend=legend;this.readout=readout;this.note=note;this.plot=new ScienceView.Plot(svg,legend,readout);}
  update(gas,{type='time',measurement='theory',unit='kPa',visible=[true,true,true,true,true]}={}){
   const factor=unit==='atm'?1/101.325:1,unitLabel=unit,stats=gas.stats(),s=gas.latest,f=v=>Number(v.toPrecision(13)).toLocaleString('es-ES',{maximumFractionDigits:unit==='atm'?4:2});
   if(type==='time'){
    const series=[];
    for(let i=0;i<4;i++)if(visible[i]&&(i<3||gas.n[3]>0))series.push({name:D.species[i].name,color:plotColors[i],points:gas.history.map(p=>({x:p.t,y:(measurement==='theory'?p.partial[i]:p.measured[i])===null?null:(measurement==='theory'?p.partial[i]:p.measured[i])*factor}))});
    if(visible[4])series.push({name:'Total · mezcla',color:'#244b4b',points:gas.history.map(p=>({x:p.t,y:(measurement==='theory'?p.total:p.measuredTotal)===null?null:(measurement==='theory'?p.total:p.measuredTotal)*factor}))});
    this.plot.set(series,{xLabel:'Tiempo físico · ms',yLabel:'Presión · '+unitLabel,caption:measurement==='theory'?'Valores esperados: nᵢRT/V disponible. No son medidas de impactos.':'Impulso real en paredes por especie, media móvil de hasta 2 ms. No se añade ruido aleatorio.'});
    this.note.textContent=gas.partition?'Con la pared, las curvas de N₂ y O₂ son presiones locales de compartimentos diferentes; no existe una presión total única de mezcla.':'La curva total suma las contribuciones de todas las especies, incluidas las trazas del modo aire. Cambiar un filtro visual no elimina gases.';return;
   }
   if(type==='speed'){
    const series=[],vmax=Math.max(1100,...gas.p.flat().map(q=>Math.hypot(q.vx,q.vy,q.vz)))*1.05,bins=16,dv=vmax/bins;
    for(let i=0;i<3;i++)if(gas.p[i].length&&visible[i]){
     const arr=gas.p[i],counts=Array(bins).fill(0),mRT=D.species[i].M/(D.R*gas.T);
     for(const q of arr)counts[Math.min(bins-1,Math.floor(Math.hypot(q.vx,q.vy,q.vz)/dv))]++;
     series.push({name:D.species[i].name+' · muestra',color:plotColors[i],points:counts.map((n,j)=>({x:(j+.5)*dv,y:n/(arr.length*dv)}))});
     series.push({name:D.species[i].name+' · Maxwell 3D',color:plotColors[i],dash:true,points:Array.from({length:100},(_,j)=>{const v=j*vmax/99;return{x:v,y:Math.sqrt(2/Math.PI)*mRT**1.5*v*v*Math.exp(-mRT*v*v/2)};})});
    }
    this.plot.set(series,{xLabel:'Rapidez molecular · m/s',yLabel:'Densidad · (m/s)⁻¹',caption:'Frecuencias reales de la muestra representada. Las líneas discontinuas son las distribuciones de Maxwell 3D a la T elegida.',xRange:[0,vmax]});
    this.note.textContent='La muestra inicial se prepara con componentes gaussianas, condicionadas a los segundos momentos térmicos. En muestras pequeñas el histograma será irregular. Los gases no se equilibran entre sí porque se omiten sus choques.';return;
   }
   const compact=this.svg.parentElement.clientWidth<540,CW=compact?440:760,left=compact?70:88,right=CW-26,span=right-left,rows=gas.n[3]>0?4:3;
   this.svg.setAttribute('viewBox',`0 0 ${CW} 310`);this.plot.series=[];this.plot.active=false;
   const maximum=type==='fractions'?1:Math.max(1,...stats.partial,...stats.measured.filter(v=>v!==null))*factor*1.12;
   let markup=`<rect width="${CW}" height="310" fill="white"/><g font-family="system-ui" font-size="${compact?13:12}" fill="#527075">`;
   for(let j=0;j<5;j++){const x=left+span*j/4;markup+=`<path d="M${x} 30V261" stroke="#e5ebe7"/><text x="${x}" y="282" text-anchor="middle">${type==='fractions'?j*25+' %':f(maximum*j/4)}</text>`;}
   for(let i=0;i<rows;i++){
    const y=48+i*52,color=D.species[i].color,v=type==='fractions'?stats.x[i]:stats.partial[i]*factor,bar=v/maximum*span;
    markup+=`<text x="${left-12}" y="${y+12}" text-anchor="end">${D.species[i].name}</text><rect x="${left}" y="${y}" width="${Math.max(0,bar)}" height="17" rx="3" fill="${color}"><title>${D.species[i].name}: ${type==='fractions'?f(v*100)+' %':f(v)+' '+unitLabel}</title></rect>`;
    if(type==='bars'&&stats.measured[i]!==null){const m=stats.measured[i]*factor/maximum*span;markup+=`<path d="M${left} ${y+25}H${left+m}" stroke="${color}" stroke-width="4"/><circle cx="${left+m}" cy="${y+25}" r="3" fill="#244b4b"/>`;}
    markup+=`<text x="${Math.min(right-4,left+bar+7)}" y="${y+12}" font-size="${compact?11:12}" text-anchor="${bar>span*.85?'end':'start'}">${type==='fractions'?f(v*100)+' %':f(v)}</text>`;
   }
   markup+=`<text x="${CW/2}" y="305" text-anchor="middle">${type==='fractions'?'Fracción molar xᵢ = nᵢ / n_total':'Presión · '+unitLabel}</text></g>`;this.svg.innerHTML=markup;
   this.legend.innerHTML=type==='bars'?'<span>Barra gruesa: teoría</span><span>Línea fina y punto: impactos medidos</span>':'<span>Porcentajes en cantidad de sustancia · no fracciones másicas</span>';
   this.readout.textContent=type==='bars'?D.species.slice(0,rows).map((s,i)=>s.name+': '+f(stats.partial[i]*factor)+' '+unitLabel+'; impactos '+(stats.measured[i]===null?'midiendo…':f(stats.measured[i]*factor))).join(' · '):D.species.slice(0,rows).map((s,i)=>s.name+': x = '+stats.x[i].toLocaleString('es-ES',{maximumFractionDigits:5})).join(' · ');
   if(type==='fractions'&&!stats.nTotal)this.readout.textContent='Recipiente vacío: las fracciones molares no están definidas.';
   this.note.textContent=gas.partition?'Las presiones de N₂ y O₂ son locales. Las fracciones describen la composición global; Pᵢ = xᵢP_total se aplicará a la mezcla que comparta el volumen completo.':type==='fractions'?'Para una mezcla ideal a T y V comunes, la fracción de la presión total coincide con la fracción molar.':'Las barras proceden de nᵢRT/V; los puntos proceden de la transferencia real de momento en las paredes.';
  }
 }
 root.DaltonView={draw,Charts};
})(typeof globalThis!=='undefined'?globalThis:this);

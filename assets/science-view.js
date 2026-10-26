/* Particle drawing and scientific plots. Values are provided by the engines; no physics here. */
(function(root){
 'use strict';const colors={a:'#86dcca',b:'#f0ad82',blue:'#83bdff',orange:'#ffaf72',muted:'#78969c'};
 function arrow(c,x,y,dx,dy,color){const length=Math.hypot(dx,dy);if(length<1)return;const a=Math.atan2(dy,dx);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.1;c.beginPath();c.moveTo(x,y);c.lineTo(x+dx,y+dy);c.stroke();c.beginPath();c.moveTo(x+dx,y+dy);c.lineTo(x+dx-4*Math.cos(a-.5),y+dy-4*Math.sin(a-.5));c.lineTo(x+dx-4*Math.cos(a+.5),y+dy-4*Math.sin(a+.5));c.fill();}
 function draw(canvas,gas,options={}){
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,viewW=options.viewW||gas.W,viewH=options.viewH||gas.H;
  const scale=Math.min((w-62)/viewW,(h-38)/viewH),x0=(w-gas.W*scale)/2,y0=(h-gas.H*scale)/2,W=gas.W*scale,H=gas.H*scale;
  c.clearRect(0,0,w,h);c.fillStyle='#142e36';c.fillRect(0,0,w,h);c.fillStyle='#1b3c45';c.fillRect(x0,y0,W,H);
  c.fillStyle='#34515a';for(let x=x0+12;x<x0+W;x+=24)for(let y=y0+12;y<y0+H;y+=24){c.beginPath();c.arc(x,y,.65,0,Math.PI*2);c.fill();}
  c.strokeStyle='#708f94';c.lineWidth=1.5;c.strokeRect(x0,y0,W,H);
  if(options.piston){c.strokeStyle='#b9d8d3';c.lineWidth=5;c.beginPath();c.moveTo(x0+W,y0);c.lineTo(x0+W,y0+H);c.stroke();}
  const layer=(g,o)=>{
   const color=o.color||colors.a;
   if(o.trail?.length>1){c.strokeStyle=color;c.globalAlpha=.48;c.lineWidth=1.7;c.beginPath();o.trail.forEach((p,i)=>{const x=x0+p.x*scale,y=y0+p.y*scale;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();c.globalAlpha=1;}
   if(o.forces&&!g.ideal){c.lineWidth=.7;for(let i=0;i<g.p.length;i++)for(let j=i+1;j<g.p.length;j++){
    const a=g.p[i],b=g.p[j],r=Math.hypot(a.x-b.x,a.y-b.y);if(r<1.7*g.sigma){c.strokeStyle=r<1.12*g.sigma?'#f0ad8250':'#82d7ce45';c.beginPath();c.moveTo(x0+a.x*scale,y0+a.y*scale);c.lineTo(x0+b.x*scale,y0+b.y*scale);c.stroke();}
   }}
   for(let i=0;i<g.p.length;i++){
    const p=g.p[i],x=x0+p.x*scale,y=y0+p.y*scale,r=g.ideal?2.6:(g.r||g.sigma/2)*scale,selected=i===o.selected;
    const fill=o.speedColors?`hsl(${Math.max(10,190-Math.hypot(p.vx,p.vy)*40)} 70% 68%)`:color;
    c.fillStyle=fill;c.globalAlpha=o.secondary?.65:1;c.beginPath();c.arc(x,y,Math.max(2.5,r),0,Math.PI*2);c.fill();c.globalAlpha=1;
    c.strokeStyle=o.secondary?color:'#e6f6ed75';c.lineWidth=o.secondary?1.5:.8;c.stroke();
    if(selected){c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(x,y,r+4,0,Math.PI*2);c.stroke();c.fillStyle='#fff';c.font='11px system-ui';c.fillText(String(i+1),x+r+6,y-4);}
    if(o.vectors)arrow(c,x,y,p.vx*9,p.vy*9,fill);
    if(o.forces&&!g.ideal){const length=Math.hypot(p.fx,p.fy),f=length?Math.min(28,length*3)/length:0;arrow(c,x,y,p.fx*f,p.fy*f,'#ffdc95');}
   }
  };
  layer(gas,options);if(options.overlay)layer(options.overlay,{...options,color:colors.orange,trail:options.trailB,secondary:true});
 }
 const ns='http://www.w3.org/2000/svg',esc=s=>String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const num=v=>Math.abs(v)>0&&(Math.abs(v)<.001||Math.abs(v)>9999)?v.toExponential(1):Number(v.toFixed(3)).toLocaleString('es-ES');
 class Plot{
  constructor(svg,legend,readout){this.svg=svg;this.legend=legend;this.readout=readout;this.index=0;this.active=false;this.svg.addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect();this.active=true;this.px=(e.clientX-r.left)/r.width*this.width;this.inspect(this.px);});this.svg.addEventListener('pointerleave',()=>{this.active=false;});this.svg.addEventListener('blur',()=>{this.active=false;});this.svg.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.active=true;this.px=null;this.index+=e.key==='ArrowLeft'?-1:1;this.inspectIndex(this.index);}});}
  set(series,{xLabel='Tiempo reducido',yLabel='',log=false,xRange,yRange,caption=''}={}){
   if(this.xLabel!==xLabel||this.yLabel!==yLabel)this.active=false;this.series=series;this.log=log;this.xLabel=xLabel;this.yLabel=yLabel;const compact=this.svg.parentElement.clientWidth<540,CW=compact?440:760;this.width=CW;this.plotWidth=CW-94;this.svg.setAttribute('viewBox','0 0 '+CW+' 310');
   const values=series.flatMap(s=>s.points).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&(!log||p.y>0));
   let [xmin,xmax]=xRange||[Math.min(0,...values.map(p=>p.x)),Math.max(1,...values.map(p=>p.x))];
   const transform=v=>log?Math.log10(v):v;
   let ymin,ymax;if(yRange){[ymin,ymax]=yRange.map(transform);}else{ymin=values.length?Math.min(...values.map(p=>transform(p.y))):log?-10:0;ymax=values.length?Math.max(...values.map(p=>transform(p.y))):log?0:1;if(!log)ymin=Math.min(0,ymin);}
   if(ymax-ymin<1e-10){ymax+=.5;ymin-=.5;}
   if(log){const top=Math.ceil(ymax),bottom=Math.floor(ymin),step=Math.max(1,Math.ceil((top-bottom)/4));ymax=top;ymin=top-4*step;}
   else{const pad=(ymax-ymin)*.1;ymin-=pad;ymax+=pad;}
   this.domain=[xmin,xmax];const xp=x=>65+(x-xmin)/(xmax-xmin||1)*this.plotWidth,yp=y=>258-(transform(y)-ymin)/(ymax-ymin)*225;
   let markup=`<rect width="${CW}" height="310" fill="#fff"/><g font-family="system-ui" font-size="${compact?13:11}" fill="#64787b">`;
   for(let i=0;i<5;i++){const x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;markup+=`<path d="M65 ${258-i*225/4}H${CW-29}" stroke="#e5ebe7"/><text x="55" y="${262-i*225/4}" text-anchor="end">${esc(log?'10^'+num(y):num(y))}</text><text x="${xp(x)}" y="280" text-anchor="middle">${esc(num(x))}</text>`;}
   markup+=`<text x="${CW/2}" y="303" text-anchor="middle">${esc(xLabel)}</text><text x="65" y="18">${esc(yLabel)}${log?' · escala logarítmica':''}</text></g><defs><clipPath id="plotClip"><rect x="65" y="29" width="${this.plotWidth}" height="232"/></clipPath></defs><g clip-path="url(#plotClip)">`;
   for(const s of series){let started=false,path='';for(const p of s.points){if(!Number.isFinite(p.y)||!Number.isFinite(p.x)||log&&p.y<=0){started=false;continue;}const x=xp(p.x),y=yp(p.y);if(s.dots){markup+=`<circle cx="${x}" cy="${y}" r="4" fill="${s.color}" stroke="white"/>`;continue;}path+=(started?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);started=true;}
    if(path)markup+=`<path d="${path}" fill="none" stroke="${s.color}" stroke-width="${s.dash?1.5:2.3}"${s.dash?' stroke-dasharray="6 5"':''}/>`;
   }
   markup+='</g><path id="cursorLine" stroke="#758a8c" stroke-dasharray="3 3" visibility="hidden"/>';
   this.svg.innerHTML=markup;this.legend.innerHTML=series.map(s=>`<span><i style="background:${s.color};${s.dash?'opacity:.55':''}"></i>${esc(s.name)}</span>`).join('');this.caption=caption;this.readout.textContent=caption;
   this.cursor=this.svg.querySelector('#cursorLine');if(this.active){if(this.px!==null)this.inspect(this.px);else this.inspectIndex(this.index);}
  }
  inspect(px){const [lo,hi]=this.domain;const x=lo+Math.max(0,Math.min(1,(px-65)/this.plotWidth))*(hi-lo);const base=this.series.find(s=>s.points.length>1)?.points||[];if(!base.length)return;let best=0;for(let i=1;i<base.length;i++)if(Math.abs(base[i].x-x)<Math.abs(base[best].x-x))best=i;this.inspectIndex(best);}
  inspectIndex(index){const base=this.series.find(s=>s.points.length>1)?.points||[];if(!base.length)return;this.index=Math.max(0,Math.min(base.length-1,index));const x=base[this.index].x,[lo,hi]=this.domain,px=65+(x-lo)/(hi-lo||1)*this.plotWidth;this.cursor.setAttribute('d',`M${px} 30V258`);this.cursor.setAttribute('visibility','visible');let text=this.xLabel+' = '+num(x);for(const s of this.series){let p=s.points.reduce((a,p)=>!a||Math.abs(p.x-x)<Math.abs(a.x-x)?p:a,null);if(p&&Number.isFinite(p.y))text+=' · '+s.name+': '+num(p.y);}this.readout.textContent=text;}
 }
 function cluster(p,sigma){const parent=p.map((_,i)=>i),find=i=>{while(parent[i]!==i)i=parent[i];return i;};for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)if(Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y)<1.5*sigma)parent[find(i)]=find(j);const sizes={};for(let i=0;i<p.length;i++){const k=find(i);sizes[k]=(sizes[k]||0)+1;}return Math.max(...Object.values(sizes));}
 root.ScienceView={draw,Plot,colors,num,cluster};
})(typeof globalThis!=='undefined'?globalThis:this);

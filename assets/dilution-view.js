/* Projection of a fixed-section vessel. All comparisons share one geometric scale. */
(function(root){
 'use strict';const D=root.DilutionModel;
 const format=(v,d=2)=>v.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:d});
 class Renderer{
  constructor(canvas){this.canvas=canvas;this.c=canvas.getContext('2d');}
  text(text,x,y,size=12,color='#bfd7d3',align='center'){const c=this.c;c.fillStyle=color;c.textAlign=align;c.font=`${size}px 'Segoe UI',system-ui`;c.fillText(text,x,y);}
  line(a,b,color,width=1){const c=this.c;c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  polygon(points,color,stroke){const c=this.c;c.fillStyle=color;c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  draw(model,compare=false){const rect=this.canvas.getBoundingClientRect(),w=Math.max(300,Math.round(rect.width)),h=Math.max(280,Math.round(rect.height)),dpr=Math.min(2,devicePixelRatio||1),c=this.c;if(this.canvas.width!==w*dpr||this.canvas.height!==h*dpr){this.canvas.width=w*dpr;this.canvas.height=h*dpr;}c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.fillStyle='#142e36';c.fillRect(0,0,w,h);
   c.fillStyle='#33515a';for(let x=20;x<w;x+=25)for(let y=18;y<h;y+=25){c.beginPath();c.arc(x,y,.6,0,6.3);c.fill();}
   const col=compare?w/2:w,scale=Math.min((col-55)/1.45,(h-100)/1.62),bottom=h-42;
   if(compare){this.vessel({cx:w*.25,bottom,scale,V:model.V0,p:model.before,label:'ANTES · INICIAL',M:model.n/model.V0,count:model.p.length,time:model.time,flow:false,small:w<550});this.line({x:w/2,y:35},{x:w/2,y:h-20},'#49676b70');}
   this.vessel({cx:compare?w*.75:w*.5,bottom,scale,V:model.V,p:model.p,label:compare?(model.finished?'DESPUÉS · DILUIDA':'AHORA · DILUYENDO'):'',M:model.n/model.V,count:model.p.length,time:model.time,flow:model.started&&!model.finished,small:w<550});
  }
  vessel({cx,bottom,scale:s,V,p,label,M,count,time,flow,small}){const H=D.height(V),maxH=D.HEIGHT,c=this.c,project=(x,y,z)=>({x:cx+(x-.5)*s+(z-D.DEPTH/2)*s*.35,y:bottom-y*s-(z-D.DEPTH/2)*s*.22}),point=(x,y,z)=>project(x,y,z),front=0,back=D.DEPTH;
   const face=(y)=>[point(0,y,front),point(1,y,front),point(1,y,back),point(0,y,back)];
   // Fixed transparent walls. Height is proportional to total solution volume.
   this.polygon([point(0,0,back),point(1,0,back),point(1,maxH,back),point(0,maxH,back)],'#284c562b','#66878b80');this.polygon([point(1,0,front),point(1,0,back),point(1,maxH,back),point(1,maxH,front)],'#42666d18','#77989b70');
   this.polygon([point(0,0,back),point(1,0,back),point(1,H,back),point(0,H,back)],'#6cc9e649');
   this.polygon([point(0,0,front),point(1,0,front),point(1,H,front),point(0,H,front)],'#6cc9e640');this.polygon([point(1,0,front),point(1,0,back),point(1,H,back),point(1,H,front)],'#6cc9e637');this.polygon(face(H),'#91def345','#b3e7ef95');
   if(flow){const source=point(.28,maxH+.13,.55),target=point(.28,H,.55);c.lineCap='round';this.line({x:source.x-21,y:source.y},{x:source.x,y:source.y},'#a7c8ca',6);this.line(source,target,'#a4e4ef94',Math.max(3,s*.024));for(let i=0;i<7;i++){const f=((time*1.8+i/7)%1);const yy=source.y+(target.y-source.y)*f;this.line({x:source.x-1,y:yy-3},{x:source.x+1,y:yy+3},'#d6f8f2',1.5);}c.lineCap='butt';}
   const sorted=p.map(q=>({...point(q.x,q.y,q.z),depth:q.z})).sort((a,b)=>b.depth-a.depth),r=Math.max(2.4,s*.015);
   for(const q of sorted){const gradient=c.createRadialGradient(q.x-r*.3,q.y-r*.35,.1,q.x,q.y,r);gradient.addColorStop(0,'#ffe4af');gradient.addColorStop(.3,'#ffbd70');gradient.addColorStop(1,'#da7136');c.fillStyle=gradient;c.beginPath();c.arc(q.x,q.y,r,0,Math.PI*2);c.fill();c.strokeStyle='#ffd6aa88';c.lineWidth=.5;c.stroke();}
   for(const x of [0,1])for(const z of [front,back])this.line(point(x,0,z),point(x,maxH,z),z===front?'#a2c2c58c':'#66878b55');for(const y of [0,maxH]){const facePoints=face(y);for(let i=0;i<4;i++)this.line(facePoints[i],facePoints[(i+1)%4],'#a7c8cb8c');}
   // Identical fixed graduation positions, even in side-by-side mode.
   for(let liters=.25;liters<=D.CAPACITY;liters+=.25){const a=point(1,D.height(liters),0);this.line(a,{x:a.x-8,y:a.y},'#b9d6d6a0');if(liters%.5===0)this.text(format(liters)+' L',a.x+6,a.y+3,small?8:10,'#a9c7c4','left');}
   if(label)this.text(label,cx,20,small?10:12,'#c5e4d4');this.text(format(V)+' L · '+format(M,4)+' M',cx,bottom+23,small?10:14,'#dceee0');if(label)this.text(count+' partículas',cx,41,small?9:11,'#f0bc8f');
  }
 }
 root.DilutionView={Renderer,format};
})(globalThis);

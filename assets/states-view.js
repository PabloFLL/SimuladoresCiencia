/* Orthographic 3D projection with one shared camera and scale for all three states. */
(function(root){
 'use strict';
 const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]],corners=Array.from({length:8},(_,i)=>({x:i&1?1:0,y:i&2?1:0,z:i&4?1:0}));
 const yaw=.43,pitch=.24,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 function projection(p){const x=p.x-.5,y=p.y-.5,z=p.z-.5,depth=x*sy+z*cy;return {u:x*cy-z*sy,v:y*cp-depth*sp,depth:y*sp+depth*cp};}
 function sprite(){const canvas=document.createElement('canvas');canvas.width=canvas.height=80;const c=canvas.getContext('2d'),g=c.createRadialGradient(27,22,3,39,41,37);g.addColorStop(0,'#e6fff0');g.addColorStop(.25,'#b0efcc');g.addColorStop(.60,'#54b99e');g.addColorStop(1,'#1e625c');c.fillStyle=g;c.beginPath();c.arc(40,40,37,0,2*Math.PI);c.fill();c.strokeStyle='#c9f9de80';c.lineWidth=1;c.stroke();return canvas;}
 class Renderer{
  constructor(canvases){this.canvases=canvases;this.sprite=sprite();this.contexts=canvases.map(c=>c.getContext('2d'));}
  draw(lab,{grid=false,trails=false}={}){
   for(let i=0;i<3;i++)this.drawWorld(i,lab.worlds[i],lab.history[i],grid,trails);
  }
  drawWorld(index,world,history,grid,trails){
   const canvas=this.canvases[index],ctx=this.contexts[index],bounds=canvas.getBoundingClientRect(),w=Math.max(90,Math.round(bounds.width)),h=Math.max(120,Math.round(bounds.height)),dpr=Math.min(devicePixelRatio||1,2);
   if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#142e36';ctx.fillRect(0,0,w,h);
   const scale=Math.min((w-23)/1.39,(h-28)/1.30),ox=w/2,oy=h/2,project=p=>{const q=projection(p);return {x:ox+q.u*scale,y:oy+q.v*scale,depth:q.depth};},vertices=corners.map(project);
   const line=(a,b,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
   // Equal translucent observation windows, including the nearly empty gas window.
   ctx.fillStyle='#294c4f30';ctx.beginPath();for(const [j,k] of [[0,0],[1,1],[2,3],[3,2]]){const p=vertices[k];j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.closePath();ctx.fill();
   for(const [a,b] of edges)line(vertices[a],vertices[b],'#597b7d65');
   const particles=world.p.map((p,i)=>({...project(p),id:i})).sort((a,b)=>a.depth-b.depth),radius=world.r*scale;
   for(const p of particles){ctx.drawImage(this.sprite,p.x-radius*80/74,p.y-radius*80/74,2*radius*80/74,2*radius*80/74);if(p.id<2&&trails){ctx.strokeStyle=p.id?'#fcffeb':'#f7d099';ctx.lineWidth=w<180?.8:1.4;ctx.beginPath();ctx.arc(p.x,p.y,radius+1.5,0,2*Math.PI);ctx.stroke();}}
   if(grid){
    for(const axis of ['x','y','z']){const others=['x','y','z'].filter(v=>v!==axis),p=[{[axis]:.5,[others[0]]:0,[others[1]]:0},{[axis]:.5,[others[0]]:1,[others[1]]:0},{[axis]:.5,[others[0]]:1,[others[1]]:1},{[axis]:.5,[others[0]]:0,[others[1]]:1}].map(project);for(let j=0;j<4;j++)line(p[j],p[(j+1)%4],'#c8dfbc55',1);}
   }
   if(trails)for(let j=0;j<2;j++){const points=history[j]||[];ctx.strokeStyle=j?'#e9ebd690':'#f4c58eb0';ctx.lineWidth=w<180?1:1.6;ctx.beginPath();points.forEach((point,k)=>{const q=project(point);k?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});ctx.stroke();}
   // Front edges remain visible over dense samples; perspective never changes by state.
   for(const [a,b] of edges)if(corners[a].z===1&&corners[b].z===1||corners[a].x===1&&corners[b].x===1)line(vertices[a],vertices[b],'#92b5b58a');
  }
 }
 root.StatesView={Renderer,projection};
})(globalThis);

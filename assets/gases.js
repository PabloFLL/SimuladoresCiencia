'use strict';
const $=id=>document.getElementById(id),cfg=CONFIG;
let state=gasSolve(cfg.law),paused=matchMedia('(prefers-reduced-motion: reduce)').matches,last=0;
const canvas=$('gasScene'),ctx=canvas.getContext('2d');
const format=(n,d=2)=>n.toLocaleString('es-ES',{maximumFractionDigits:d});
let seed=8261;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;};
const particles=Array.from({length:48},()=>{const a=random()*2*Math.PI;return{x:random(),y:random(),vx:Math.cos(a)*(0.7+random()),vy:Math.sin(a)*(0.7+random())};});
function update(value){
 const v=Math.max(cfg.min,Math.min(cfg.max,value));
 state=gasSolve(cfg.law,{[cfg.key]:v});$('control').value=v;
 $('controlValue').textContent=format(v,cfg.key==='T'?0:1)+' '+cfg.unit;
 $('control').setAttribute('aria-valuetext',format(v)+' '+cfg.unit);
 $('responseValue').textContent=format(state[cfg.response]);
 $('temperatureCaption').textContent=cfg.key==='T'?format(state.T-273.15,1)+' °C':'';
 $('half').disabled=v<=cfg.min;$('double').disabled=v>=cfg.max;
 $('pause').textContent=paused?'Continuar':'Pausar';$('pause').setAttribute('aria-pressed',String(paused));draw(0);
}
function draw(dt){
 const c=ctx,W=760,H=460;c.clearRect(0,0,W,H);c.fillStyle='#142e36';c.fillRect(0,0,W,H);
 const left=80,right=451,bottom=373,top=bottom-282*state.V/12;
 const hot=(state.T-150)/450,color=cfg.law==='boyle'?'#8de3c7':`rgb(${Math.round(106+140*hot)},${Math.round(208-50*hot)},${Math.round(228-103*hot)})`;
 c.fillStyle='#1a3a43';c.fillRect(left,81,right-left,bottom-81);c.fillStyle=color;c.globalAlpha=.065;c.fillRect(left,top,right-left,bottom-top);c.globalAlpha=1;
 c.lineWidth=2;c.strokeStyle='#6e969a';c.beginPath();c.moveTo(left,80);c.lineTo(left,bottom);c.lineTo(right,bottom);c.lineTo(right,80);c.stroke();
 const width=right-left-18,height=bottom-top-20,speed=72*Math.sqrt(state.T/300);
 for(const p of particles){
  if(!paused){p.x+=p.vx*speed*dt/width;p.y+=p.vy*speed*dt/height;}
  for(const [pos,vel]of [['x','vx'],['y','vy']])while(p[pos]<0||p[pos]>1){if(p[pos]<0){p[pos]=-p[pos];p[vel]=Math.abs(p[vel]);}if(p[pos]>1){p[pos]=2-p[pos];p[vel]=-Math.abs(p[vel]);}}
  const x=left+9+p.x*width,y=top+10+p.y*height;c.fillStyle=color;c.beginPath();c.arc(x,y,3.7,0,Math.PI*2);c.fill();
 }
 c.fillStyle='#c6dad5';c.fillRect(left-5,top-9,right-left+10,13);
 if(cfg.law!=='gay'){c.fillStyle='#6e969a';c.fillRect(257,56,16,Math.max(2,top-65));c.fillStyle='#c6dad5';c.fillRect(236,50,59,8);}
 c.fillStyle='#def0e9';c.font='500 21px Segoe UI, sans-serif';c.fillText('V = '+format(state.V)+' L',left+17,bottom-18);
 // Pressure comes from the ideal gas equation, not from the drawn particles.
 const gx=592,gy=193,r=65,maxP=3;c.strokeStyle='#46676f';c.lineWidth=9;c.lineCap='round';c.beginPath();c.arc(gx,gy,r,Math.PI*.75,Math.PI*2.25);c.stroke();
 c.strokeStyle=color;c.beginPath();c.arc(gx,gy,r,Math.PI*.75,Math.PI*.75+Math.min(1,state.P/maxP)*Math.PI*1.5);c.stroke();
 const a=Math.PI*.75+Math.min(1,state.P/maxP)*Math.PI*1.5;c.lineWidth=3;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx+Math.cos(a)*43,gy+Math.sin(a)*43);c.stroke();c.fillStyle=color;c.beginPath();c.arc(gx,gy,5,0,Math.PI*2);c.fill();
 c.textAlign='center';c.font='600 25px Segoe UI, sans-serif';c.fillStyle='#def0e9';c.fillText(format(state.P)+' atm',gx,gy+104);c.font='12px Segoe UI, sans-serif';c.fillStyle='#a9c5c2';c.fillText('PRESIÓN',gx,gy+128);c.font='11px Segoe UI, sans-serif';c.fillText('0',gx-55,gy+62);c.fillText('3',gx+55,gy+62);c.font='500 17px Segoe UI, sans-serif';c.fillStyle=color;c.fillText('T = '+format(state.T,0)+' K',gx,365);c.textAlign='left';
}
$('control').addEventListener('input',e=>update(Number(e.target.value)));
$('half').addEventListener('click',()=>update(state[cfg.key]/2));$('double').addEventListener('click',()=>update(state[cfg.key]*2));
$('pause').addEventListener('click',()=>{paused=!paused;update(state[cfg.key]);});$('reset').addEventListener('click',()=>{paused=false;update(GAS_DEFAULT[cfg.key]);});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='Ampliar con el navegador';}});
document.addEventListener('visibilitychange',()=>{last=0;});
function frame(t){const dt=last?Math.min((t-last)/1000,.035):0;last=t;draw(dt);requestAnimationFrame(frame);}
update(GAS_DEFAULT[cfg.key]);requestAnimationFrame(frame);

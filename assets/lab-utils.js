'use strict';
const Lab={
  $:id=>document.getElementById(id),
  format:(n,d=2)=>Number.isFinite(n)?n.toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d}):'∞',
  csv(name,rows){const content='\ufeff'+rows.map(row=>row.map(v=>typeof v==='number'?String(v).replace('.',','):String(v)).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
  async fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{Lab.notice('No se pudo activar la pantalla completa.');}},
  notice(message){const el=Lab.$('toast');el.textContent=message;el.hidden=false;clearTimeout(Lab.timer);Lab.timer=setTimeout(()=>el.hidden=true,3000);},
  plot(canvas,{xmin=0,xmax,ymin,ymax,xlabel,ylabel,curves=[],vertical=null,markers=[]}){
    const c=canvas.getContext('2d'),W=canvas.width,H=canvas.height,L=65,R=W-24,T=37,B=H-50;
    c.clearRect(0,0,W,H);c.fillStyle='#142d34';c.fillRect(0,0,W,H);
    const px=x=>L+(x-xmin)/(xmax-xmin)*(R-L),py=y=>B-(y-ymin)/(ymax-ymin)*(B-T);
    c.font='11px system-ui';c.lineWidth=1;
    for(let i=0;i<=4;i++){const x=xmin+(xmax-xmin)*i/4,y=ymin+(ymax-ymin)*i/4;c.strokeStyle='#2e494f';c.beginPath();c.moveTo(px(x),T);c.lineTo(px(x),B);c.moveTo(L,py(y));c.lineTo(R,py(y));c.stroke();c.fillStyle='#bed4cc';c.textAlign='center';c.fillText(Lab.format(x,Math.abs(xmax)<4?2:1),px(x),B+20);c.textAlign='right';c.fillText(Lab.format(y,Math.abs(ymax)<1?3:1),L-10,py(y)+4);}
    c.strokeStyle='#7c9f97';c.beginPath();c.moveTo(L,T);c.lineTo(L,B);c.lineTo(R,B);c.stroke();c.textAlign='left';c.fillStyle='#d0e2d8';c.fillText(ylabel,L,20);c.textAlign='center';c.fillText(xlabel,(L+R)/2,H-10);
    c.save();c.beginPath();c.rect(L,T,R-L,B-T);c.clip();
    if(ymin<0&&ymax>0){c.strokeStyle='#71968c';c.setLineDash([4,5]);c.beginPath();c.moveTo(L,py(0));c.lineTo(R,py(0));c.stroke();c.setLineDash([]);}
    for(const curve of curves){c.strokeStyle=curve.color||'#83e3ba';c.lineWidth=2.4;c.beginPath();curve.points.forEach(([x,y],i)=>{if(i)c.lineTo(px(x),py(y));else c.moveTo(px(x),py(y));});c.stroke();}
    if(vertical!==null){c.strokeStyle='#efb47d';c.setLineDash([4,4]);c.beginPath();c.moveTo(px(vertical),T);c.lineTo(px(vertical),B);c.stroke();c.setLineDash([]);}
    for(const m of markers){c.fillStyle=m.color||'#efb47d';c.beginPath();c.arc(px(m.x),py(m.y),6,0,2*Math.PI);c.fill();}
    c.restore();return {c,px,py};
  }
};
if(document.getElementById('fullscreen'))document.getElementById('fullscreen').addEventListener('click',Lab.fullscreen);

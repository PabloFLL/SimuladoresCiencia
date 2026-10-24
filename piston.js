'use strict';
(()=>{
 const {$,format}=Lab,defaults={proposed:3,T:300,n:.25,mass:20,atm:101.325};
 let p={...defaults},V=3,held=true,running=false,last=0,clock=0,rows=[],previousStatus='',particlesPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const dots=Array.from({length:45},(_,i)=>({x:((i*37)%97)/97,y:((i*53+11)%101)/101,vx:Math.sin(i*2.4),vy:Math.cos(i*1.7)}));
 function mode(){const m=Bach.piston(p,V);return held?'Sujeto':V<=1+1e-6&&m.below?'Tope inferior':V>=12-1e-6&&m.above?'Tope superior':Math.abs(m.force)<5?'Equilibrio aproximado':'Libre en evolución';}
 function redraw(dt=0){
  const m=Bach.piston(p,V),proposal=Bach.piston(p,p.proposed),c=$('piston').getContext('2d'),left=62,right=338,bottom=352,top=bottom-264*V/12;
  c.fillStyle='#142d34';c.fillRect(0,0,680,420);c.fillStyle='#203f46';c.fillRect(left,80,right-left,bottom-80);c.strokeStyle='#88ada0';c.lineWidth=2;c.strokeRect(left,80,right-left,bottom-80);
  const color=p.T>400?'#efb47d':'#83e3ba';c.fillStyle=color;c.globalAlpha=.08;c.fillRect(left,top,right-left,bottom-top);c.globalAlpha=1;
  const count=Math.max(9,Math.round(p.n/.5*dots.length));
  for(const q of dots.slice(0,count)){if(dt&&!particlesPaused){q.x+=q.vx*dt*.2*Math.sqrt(p.T/300);q.y+=q.vy*dt*.2*Math.sqrt(p.T/300)*12/V;for(const k of ['x','y']){if(q[k]<0){q[k]=-q[k];q['v'+k]=Math.abs(q['v'+k]);}if(q[k]>1){q[k]=2-q[k];q['v'+k]=-Math.abs(q['v'+k]);}}}c.fillStyle=color;c.beginPath();c.arc(left+8+q.x*(right-left-16),top+6+q.y*Math.max(5,bottom-top-14),2.8,0,Math.PI*2);c.fill();}
  c.fillStyle=held?'#e5ba83':'#cee2d3';c.fillRect(left-5,top-6,right-left+10,11);c.fillStyle='#93b3a8';c.fillRect(195,33,12,Math.max(1,top-39));c.fillStyle='#c6d8ce';c.fillRect(172,29,59,8);
  const plates=Math.ceil(p.mass/25);for(let i=0;i<plates;i++){c.fillStyle='#738e8c';c.fillRect(166,top-17-i*8,70,6);}
  c.fillStyle='#d5e8dc';c.font='13px system-ui';c.textAlign='left';c.fillText('Carga: '+format(p.mass,0)+' kg',400,39);c.fillText('Exterior: '+format(p.atm,3)+' kPa',400,61);
  const scale=108/Math.max(m.Pgas,m.Pload),x=485,y=207;
  function arrow(y0,y1,color,label,at=x){if(Math.abs(y1-y0)<.2)return;c.strokeStyle=color;c.fillStyle=color;c.lineWidth=4;c.beginPath();c.moveTo(at,y0);c.lineTo(at,y1);c.stroke();const sign=Math.sign(y1-y0);c.beginPath();c.moveTo(at-6,y1-sign*10);c.lineTo(at,y1);c.lineTo(at+6,y1-sign*10);c.stroke();c.font='12px system-ui';c.fillText(label,at+12,(y0+y1)/2);}
  arrow(y,y-m.Pgas*scale,'#83e3ba','Gas');arrow(y+4,y+4+m.Pload*scale,'#efb47d','Carga total');if(held||mode().startsWith('Tope'))arrow(y+4,y+4+(m.Pgas-m.Pload)*scale,'#83c9ed',held?'Sujeción':'Tope',596);
  c.fillStyle='#d5e8dc';c.font='bold 20px system-ui';c.fillText('V = '+format(V)+' L',left+14,bottom-13);c.font='12px system-ui';c.fillText('T = '+format(p.T,0)+' K · '+format(p.T-273.15)+' °C',left,389);c.fillText(mode(),400,354);c.fillStyle='#aac8bc';c.font='11px system-ui';c.fillText('F gas-carga = '+format(m.force)+' N',400,380);
  const curve=Array.from({length:181},(_,i)=>{const x=1+11*i/180;return[x,p.n*Bach.R*p.T/x];});
  const chart=Lab.plot($('pressureGraph'),{xmin:1,xmax:12,ymin:0,ymax:Math.max(curve[0][1],m.Pload)*1.12,xlabel:'Volumen (L) · recorrido posible',ylabel:'Presión absoluta (kPa)',curves:[{points:curve},{color:'#efb47d',points:[[1,m.Pload],[12,m.Pload]]}],markers:[{x:V,y:m.Pgas}]});
  if(p.proposed>=1&&p.proposed<=12){const x=chart.px(p.proposed),y=chart.py(proposal.Pgas);chart.c.strokeStyle='#ff9390';chart.c.lineWidth=2;chart.c.beginPath();chart.c.moveTo(x-5,y-5);chart.c.lineTo(x+5,y+5);chart.c.moveTo(x+5,y-5);chart.c.lineTo(x-5,y+5);chart.c.stroke();}
 }
 function update(){const m=Bach.piston(p,V),proposal=Bach.piston(p,p.proposed),label=mode();$('actualV').textContent=format(V)+' L';$('gasP').textContent=format(m.Pgas)+' kPa';$('loadP').textContent=format(m.Pload)+' kPa';$('equilibriumV').textContent=format(m.freeV)+' L';$('eqLocation').textContent=m.below||m.above?'Fuera del recorrido del cilindro':'Dentro del recorrido';$('heldLabel').textContent=label.startsWith('Tope')?'Apoyado en el tope':held?'Una sujeción aporta la fuerza restante':running?'Émbolo libre':'Pausa didáctica';$('modeTag').textContent=label;$('pause').disabled=held;$('pause').textContent=running?'Pausar movimiento':'Continuar movimiento';
  $('outProposed').textContent=format(p.proposed)+' L';$('outT').textContent=format(p.T,0)+' K';$('outN').textContent=format(p.n,3)+' mol';$('outMass').textContent=format(p.mass,0)+' kg';$('outAtm').textContent=format(p.atm,3)+' kPa';
  let status=held?'Émbolo sujeto: al liberarlo '+(m.sustainable?'apenas cambiará su posición.':m.force>0?'subirá porque el gas empuja más que la carga.':'bajará porque la carga empuja más que el gas.'):label.startsWith('Tope')?label+': no alcanza el equilibrio libre. El tope aporta la fuerza de reacción.':m.sustainable?'Equilibrio mecánico aproximado: P gas ≈ P carga.':m.force>0?'El émbolo libre asciende hacia un volumen mayor.':'El émbolo libre desciende hacia un volumen menor.';
  if(status!==previousStatus){$('status').textContent=status;previousStatus=status;}
  $('proposalResult').textContent=p.proposed<1||p.proposed>12?'Tu propuesta de '+format(p.proposed)+' L queda fuera del recorrido geométrico de 1…12 L. El émbolo se coloca en el tope más próximo.':proposal.sustainable?'Tu propuesta está próxima al equilibrio libre para la carga actual.':'Tu propuesta de '+format(p.proposed)+' L se puede imponer, pero no mantener libre con esta carga. Al soltar, el émbolo tenderá a '+(proposal.force>0?'subir.':'bajar.');
  $('forceResult').textContent='En el volumen real, el desequilibrio gas-carga es '+format(m.force)+' N (positivo hacia arriba). '+(held?'La sujeción aporta '+format(-m.force)+' N.':label.startsWith('Tope')?'El tope aporta '+format(-m.force)+' N y anula la fuerza neta.':'Durante el movimiento, la resistencia viscosa equilibra aproximadamente ese desequilibrio.');
 }
 function refresh(){update();redraw();}
 for(const key of Object.keys(defaults))$(key).addEventListener('input',e=>{p[key]=Number(e.target.value);if(key==='proposed'){V=Math.max(1,Math.min(12,p.proposed));held=true;running=false;}clock=0;last=0;refresh();});
 $('release').addEventListener('click',()=>{held=false;running=true;last=0;refresh();});$('hold').addEventListener('click',()=>{V=Math.max(1,Math.min(12,p.proposed));held=true;running=false;refresh();});$('pause').addEventListener('click',()=>{running=!running;last=0;refresh();});
 $('particlePause').textContent=particlesPaused?'▶ Animar partículas':'Ⅱ Pausar partículas';
 $('particlePause').setAttribute('aria-pressed',!particlesPaused);
 $('particlePause').addEventListener('click',()=>{particlesPaused=!particlesPaused;$('particlePause').textContent=particlesPaused?'▶ Animar partículas':'Ⅱ Pausar partículas';$('particlePause').setAttribute('aria-pressed',!particlesPaused);redraw();});
 $('heat').addEventListener('click',()=>{p.T=Math.min(600,p.T*2);$('T').value=p.T;refresh();});
 function reset(values={}){p={...defaults,...values};V=Math.max(1,Math.min(12,p.proposed));held=true;running=false;last=0;clock=0;for(const key of Object.keys(defaults))$(key).value=p[key];refresh();}
 $('reset').addEventListener('click',()=>reset());$('presetHeat').addEventListener('click',()=>reset({T:600}));$('presetTop').addEventListener('click',()=>reset({n:.5,T:600,mass:0}));$('presetBottom').addEventListener('click',()=>reset({n:.05,T:150,mass:150}));
 $('record').addEventListener('click',()=>{if(rows.length>=20){Lab.notice('Límite de 20 estados: descarga el CSV antes de borrar registros.');return;}const m=Bach.piston(p,V);rows.push({V,T:p.T,n:p.n,mass:p.mass,atm:p.atm,Pgas:m.Pgas,Pload:m.Pload,mode:mode()});renderRows();});
 function renderRows(){$('sampleCount').textContent=rows.length+' de 20';$('states').innerHTML=rows.map((s,i)=>`<tr><td>${i+1}</td><td>${format(s.V,4)}</td><td>${format(s.T)}</td><td>${format(s.n,3)}</td><td>${format(s.mass)}</td><td>${format(s.Pgas,4)}</td><td>${format(s.Pload,4)}</td><td>${s.mode}</td></tr>`).join('');}
 $('clear').addEventListener('click',()=>{rows=[];renderRows();});$('csv').addEventListener('click',()=>Lab.csv('piston-estados.csv',[['Estado','V_L','T_K','n_mol','masa_kg','P_exterior_kPa','P_gas_kPa','P_carga_kPa','condicion'],...rows.map((s,i)=>[i+1,s.V,s.T,s.n,s.mass,s.atm,s.Pgas,s.Pload,s.mode])]));
 $('check').addEventListener('click',()=>{const val=$('prediction').value;$('feedback').textContent=val?(val==='up'?'Tu predicción coincide con el modelo. ':'Comprueba de nuevo la relación entre fuerzas. ')+'Al aumentar T, sube la presión a volumen fijo. Si el émbolo está libre, el gas se expande hasta igualar la carga o alcanzar el tope.':'Elige una predicción antes de comprobarla.';});
 document.addEventListener('visibilitychange',()=>last=0);
 function frame(now){const dt=last?Math.min(.04,(now-last)/1000):0;last=now;if(!document.hidden){if(running&&!held){V=Bach.pistonStep(p,V,dt);clock+=dt;update();}if(!particlesPaused||running&&!held)redraw(dt);}requestAnimationFrame(frame);}refresh();requestAnimationFrame(frame);
})();

'use strict';
const {$,format}=Lab;
let chem={A:1.5,B:.5,T:298.15,V:1,catalyst:1},t=0,running=false,last=0,history=[],lastSample=-1,lastStatus='';
function record(event='muestra'){const m=equilibriumMetrics(chem);history.push({t,A:chem.A,B:chem.B,T:chem.T,V:chem.V,catalyst:chem.catalyst,cA:m.cA,cB:m.cB,Q:m.Q,K:m.K,rateForward:m.rateForward,rateReverse:m.rateReverse,event});if(history.length>1200)history.shift();lastSample=t;}
function advance(dt){chem=equilibriumStep(chem,dt);t+=dt;}
function drawVessel(m){
  const c=$('vessel').getContext('2d');c.clearRect(0,0,680,340);c.fillStyle='#142d34';c.fillRect(0,0,680,340);
  c.strokeStyle='#71998e';c.lineWidth=2;c.strokeRect(46,49,350,235);c.fillStyle='#203f46';c.fillRect(47,50,348,233);
  const fraction=chem.B/(chem.A+chem.B),countB=Math.round(60*fraction);
  for(let i=0;i<60;i++){const col=i%10,row=Math.floor(i/10),x=66+col*34+4*Math.sin(t*.7+i),y=72+row*37+4*Math.cos(t*.6+i*2);c.fillStyle=i<countB?'#efb47d':'#81dfba';c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();}
  c.font='12px system-ui';c.fillStyle='#cce0d6';c.textAlign='left';c.fillText('A ⇌ B · muestra visual de 60 puntos',46,25);c.fillText('V = '+format(chem.V)+' L · T = '+format(chem.T)+' K',46,315);
  const x=450,r=200;
  c.font='13px system-ui';c.fillStyle='#81dfba';c.fillText('A → B',x,92);c.fillStyle='#efb47d';c.fillText('B → A',x,191);
  const bars=[{rate:m.rateForward,y:115,color:'#81dfba'},{rate:m.rateReverse,y:214,color:'#efb47d'}];
  const scale=Math.max(.5,m.rateForward,m.rateReverse)*1.15;
  for(const b of bars){c.fillStyle='#29474d';c.fillRect(x,b.y,r,7);c.fillStyle=b.color;c.fillRect(x,b.y,r*b.rate/scale,7);const phase=(t*b.rate*.8)%1;c.beginPath();c.arc(x+phase*r,b.y+3.5,5,0,Math.PI*2);c.fill();c.font='12px system-ui';c.fillText(format(b.rate,3)+' mol·L⁻¹·s⁻¹',x,b.y+34);}
  c.fillStyle='#b0ccc1';c.font='10px system-ui';c.fillText('Barras con escala común automática',x,285);c.fillText('Actividad en ambos sentidos',x,304);
}
function draw(){
  const m=equilibriumMetrics(chem);$('cA').textContent=format(m.cA)+' mol/L';$('cB').textContent=format(m.cB)+' mol/L';$('Q').textContent=format(m.Q,3);$('K').textContent=format(m.K,3);$('outT').textContent=format(chem.T)+' K';$('outV').textContent=format(chem.V)+' L';$('clock').textContent='t = '+format(t)+' s';$('total').textContent='n(A) + n(B) = '+format(chem.A+chem.B)+' mol';$('rateForward').textContent=format(m.rateForward,5);$('rateReverse').textContent=format(m.rateReverse,5);$('play').textContent=running?'Ⅱ Pausar reacción':'▶ Iniciar reacción';$('play').setAttribute('aria-pressed',running);$('step').disabled=running;
  const near=Math.abs(m.Q/m.K-1)<.005;
  const status=near?'Equilibrio aproximado: Q ≈ K (diferencia relativa < 0,5 %). Las reacciones continúan.':m.Q<m.K?'Q < K: evolución neta hacia B. La velocidad directa es mayor.':'Q > K: evolución neta hacia A. La velocidad inversa es mayor.';
  if(status!==lastStatus){$('status').textContent=status;lastStatus=status;}
  drawVessel(m);
  const recent=history.filter(s=>s.t>=Math.max(0,t-60));if(!recent.length)recent.push({t,cA:m.cA,cB:m.cB});
  const current={t,cA:m.cA,cB:m.cB},all=[...recent,current],xmin=Math.max(0,t-60),xmax=Math.max(30,t),ymax=Math.max(2,...all.map(s=>Math.max(s.cA,s.cB)))*1.15;
  Lab.plot($('history'),{xmin,xmax,ymin:0,ymax,xlabel:'Tiempo simulado (s)',ylabel:'Concentración (mol/L) · escala automática',curves:[{color:'#81dfba',points:all.map(s=>[s.t,s.cA])},{color:'#efb47d',points:all.map(s=>[s.t,s.cB])}]});
}
function perturb(fn,event){record('antes: '+event);fn();record(event);draw();}
$('T').addEventListener('input',e=>perturb(()=>chem.T=Number(e.target.value),'temperatura'));
$('V').addEventListener('input',e=>perturb(()=>chem.V=Number(e.target.value),'volumen'));
$('catalyst').addEventListener('change',e=>perturb(()=>chem.catalyst=e.target.checked?4:1,'catalizador'));
for(const species of ['A','B'])$('add'+species).addEventListener('click',()=>{if(chem.A+chem.B>=10){Lab.notice('Límite didáctico: 10 mol totales. Reinicia para otra investigación.');return;}perturb(()=>chem[species]+=.5,'adición de '+species);Lab.notice('Se han añadido 0,50 mol de '+species+'. '+(running?'Observa la evolución.':'Inicia la reacción o avanza por pasos.'));});
$('play').addEventListener('click',()=>{running=!running;last=0;draw();});$('step').addEventListener('click',()=>{if(!running){advance(1);record();draw();}});
$('toEquilibrium').addEventListener('click',()=>{const r=equilibriumRates(chem.T,chem.catalyst),duration=12/(r.forward+r.reverse);const step=duration/120;for(let i=0;i<120;i++){advance(step);record();}draw();Lab.notice('Avance de '+format(duration)+' s: 12 tiempos de relajación.');});
$('reset').addEventListener('click',()=>{chem={A:1.5,B:.5,T:298.15,V:1,catalyst:1};t=0;running=false;last=0;history=[];lastSample=-1;$('T').value=chem.T;$('V').value=chem.V;$('catalyst').checked=false;$('prediction').value='';$('feedback').textContent='';record('inicial');draw();});
$('csv').addEventListener('click',()=>Lab.csv('equilibrio-historial.csv',[['t_s','n_A_mol','n_B_mol','T_K','V_L','factor_catalizador','c_A_mol_L','c_B_mol_L','Q','K','v_directa_mol_L_s','v_inversa_mol_L_s','evento'],...history.map(s=>[s.t,s.A,s.B,s.T,s.V,s.catalyst,s.cA,s.cB,s.Q,s.K,s.rateForward,s.rateReverse,s.event])]));
$('check').addEventListener('click',()=>{const choice=$('prediction').value;$('feedback').textContent=choice?(choice==='B'?'Tu predicción coincide con el modelo. ':'Revisa tu predicción. ')+'Añadir A aumenta el denominador de Q = [B]/[A]. Q disminuye y predomina la reacción directa hasta recuperar el equilibrio. A T constante, K no cambia.':'Elige una predicción antes de comprobarla.';});
document.addEventListener('visibilitychange',()=>last=0);
function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(running&&!document.hidden){advance(dt);if(t-lastSample>=.2)record();draw();}requestAnimationFrame(frame);}record('inicial');draw();requestAnimationFrame(frame);

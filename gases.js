'use strict';
const $=id=>document.getElementById(id),units={P:'atm',V:'L',T:'K',n:'mol'};
const limits={P:{min:.2,max:5,step:.05},V:{min:LAW==='boyle'?2:1,max:LAW==='boyle'?12:20,step:.1},T:{min:150,max:600,step:1},n:{min:.05,max:.75,step:.01}};
let gas=gasSolve(LAW),dependent='P',samples=[{...gas}],inversePlot=false,paused=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let visualParticles=[],previousFrame=0,toastTimer;
const storageKey='fq.states.'+LAW;
try {
 const stored=JSON.parse(localStorage.getItem(storageKey)||'null');
 if(Array.isArray(stored)) {
  const valid=stored.filter(s=>s&&['P','V','T','n'].every(k=>Number.isFinite(s[k])&&s[k]>0)&&Math.abs(s.P*s.V/(s.n*GAS_R*s.T)-1)<1e-7&&
   (LAW==='ideal'||Math.abs(s.n-GAS_DEFAULT.n)<1e-9)&&
   (LAW!=='boyle'||Math.abs(s.T-GAS_DEFAULT.T)<1e-9)&&
   (LAW!=='charles'||Math.abs(s.P-GAS_DEFAULT.P)<1e-9)&&
   (LAW!=='gay'||Math.abs(s.V-GAS_DEFAULT.V)<1e-9));
  samples=[{...GAS_DEFAULT},...valid.filter(s=>['P','V','T','n'].some(k=>Math.abs(s[k]-GAS_DEFAULT[k])>1e-9)).slice(-11)];
 }
} catch {}
function persistStates(){try{localStorage.setItem(storageKey,JSON.stringify(samples));$('storageStatus').textContent='Estados guardados en este navegador. Descarga el CSV para conservarlos.';}catch{$('storageStatus').textContent='No se pudo guardar en este navegador. Descarga el CSV para conservar los datos.';}}
function f(n,d=2){if((Math.abs(n)>0&&Math.abs(n)<.001)||Math.abs(n)>=1e6)return n.toExponential(2).replace('.',',');return n.toLocaleString('es-ES',{minimumFractionDigits:d,maximumFractionDigits:d});}
function currentDependent(){return LAW==='charles'?'V':LAW==='ideal'?dependent:'P';}
function setGasValue(k,value){
 const safety={P:[.001,100],V:[.05,200],T:[1,1500],n:[.001,2]};
 if(!Number.isFinite(value)||value<safety[k][0]||value>safety[k][1]){notify(`Usa ${k} entre ${safety[k][0]} y ${safety[k][1]} ${units[k]}. Este intervalo mantiene legible el modelo.`);refresh();return;}
 try{gas=gasSolve(LAW,{...gas,[k]:value},dependent);refresh();}catch(error){notify(error.message);refresh();}
}
function invariantUnit(){return LAW==='boyle'?'L·atm':LAW==='charles'?'L/K':LAW==='gay'?'atm/K':'L·atm/(mol·K)';}
function updateMetrics(){
 for(const k of ['P','V','T','n']){
  $('value'+k).textContent=f(gas[k],k==='n'?3:2);
  $('metric'+k).classList.toggle('calculated',k===currentDependent());
  $('tag'+k).textContent=k===currentDependent()?'Calculado':LAW==='ideal'?'Control':(LAW==='boyle'&&k==='V'||(LAW==='charles'||LAW==='gay')&&k==='T')?'Control':'Constante';
  const range=$('slider'+k),number=$('input'+k);
  if(range){const lo=Math.min(limits[k].min,gas[k]),hi=Math.max(limits[k].max,gas[k]);range.min=lo;range.max=hi;range.value=gas[k];range.disabled=k===currentDependent();number.disabled=range.disabled;
   if(document.activeElement!==number)number.value=Number(gas[k].toPrecision(8));
   $('control'+k).classList.toggle('disabled',range.disabled);
  }
 }
 $('celsius').textContent=f(gas.T-273.15,2)+' °C';
 $('rms').textContent=f(gasThermalSpeed(gas.T),0)+' m/s';
 $('invariantValue').textContent=f(gasInvariant(LAW,gas),LAW==='boyle'?4:5);
 $('comparison').textContent=LAW==='boyle'?`V/V₀ = ${f(gas.V/GAS_DEFAULT.V)} · P/P₀ = ${f(gas.P/GAS_DEFAULT.P)}. Al reducir V a la mitad, P se duplica.`:LAW==='charles'?`T/T₀ = ${f(gas.T/GAS_DEFAULT.T)} · V/V₀ = ${f(gas.V/GAS_DEFAULT.V)}. Duplicar T en kelvin duplica V.`:LAW==='gay'?`T/T₀ = ${f(gas.T/GAS_DEFAULT.T)} · P/P₀ = ${f(gas.P/GAS_DEFAULT.P)}. Duplicar T en kelvin duplica P.`:`P·V = ${f(gas.P*gas.V,4)} L·atm · n·R·T = ${f(gas.n*GAS_R*gas.T,4)} L·atm. Ambas expresiones coinciden.`;
 $('pause').textContent=paused?'▶ Animar partículas':'Ⅱ Pausar partículas';
 $('pause').setAttribute('aria-pressed',!paused);
 if(document.activeElement!==$('tempC'))$('tempC').value=Number((gas.T-273.15).toFixed(4));
 if(document.activeElement!==$('pressureKpa'))$('pressureKpa').value=Number(atmToKpa(gas.P).toFixed(4));
 $('tempC').disabled=LAW==='boyle'||currentDependent()==='T';
 $('pressureKpa').disabled=LAW!=='ideal'||dependent==='P';
 $('conversionHelp').textContent='T(K) = t(°C) + 273,15 · 1 atm = 101,325 kPa. Las casillas bloqueadas corresponden a magnitudes constantes o calculadas.';
 if(LAW==='ideal')for(const key of ['T','V','n']){const b=$('double'+key);if(b)b.disabled=dependent===key;}
}
function syncParticles(){
 const count=Math.max(8,Math.min(128,Math.round(128*gas.n/.75)));
 if(count===visualParticles.length)return;
 let seed=8471;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;};
 visualParticles=Array.from({length:count},()=>{const a=2*Math.PI*rand(),b=Math.sqrt(-2*Math.log(rand()));return{x:.04+.92*rand(),y:.04+.92*rand(),vx:Math.cos(a)*b,vy:Math.sin(a)*b};});
}
function drawScene(dt=0){
 const canvas=$('gasScene'),c=canvas.getContext('2d'),W=620,H=370;c.clearRect(0,0,W,H);c.fillStyle='#132a31';c.fillRect(0,0,W,H);
 c.strokeStyle='#294149';c.lineWidth=.6;c.beginPath();for(let x=20;x<W;x+=30){c.moveTo(x,0);c.lineTo(x,H);}for(let y=20;y<H;y+=30){c.moveTo(0,y);c.lineTo(W,y);}c.stroke();
 const left=62,right=393,bottom=297,capacity=LAW==='gay'?gas.V:Math.max(LAW==='boyle'||LAW==='charles'?12:20,gas.V*1.05),height=LAW==='gay'?223:Math.max(24,223*Math.min(1,gas.V/capacity)),top=bottom-height;
 const warmth=Math.max(0,Math.min(1,(gas.T-150)/450)),red=Math.round(95+160*warmth),green=Math.round(220-65*warmth),blue=Math.round(220-110*warmth),color=`rgb(${red},${green},${blue})`;
 c.fillStyle='#1c3a42';c.fillRect(left,74,right-left,223);c.fillStyle=color;c.globalAlpha=.075;c.fillRect(left,top,right-left,height);c.globalAlpha=1;
 c.strokeStyle='#87a6aa';c.lineWidth=2;c.beginPath();c.moveTo(left,74);c.lineTo(left,bottom);c.lineTo(right,bottom);c.lineTo(right,74);c.stroke();
 const speed=Math.min(350,48*Math.sqrt(gas.T/300)),innerW=right-left-12,innerH=Math.max(5,height-14);
 for(const p of visualParticles){if(dt&&!paused){p.x+=p.vx*speed*dt/innerW;p.y+=p.vy*speed*dt/innerH;while(p.x<0||p.x>1){if(p.x<0){p.x=-p.x;p.vx=Math.abs(p.vx);}if(p.x>1){p.x=2-p.x;p.vx=-Math.abs(p.vx);}}while(p.y<0||p.y>1){if(p.y<0){p.y=-p.y;p.vy=Math.abs(p.vy);}if(p.y>1){p.y=2-p.y;p.vy=-Math.abs(p.vy);}}}
  const x=left+6+p.x*innerW,y=top+7+p.y*innerH;c.fillStyle=color;c.shadowColor=color;c.shadowBlur=7;c.beginPath();c.arc(x,y,2.8,0,2*Math.PI);c.fill();c.shadowBlur=0;}
 c.fillStyle=LAW==='gay'?'#8aabb0':'#d8e3db';c.fillRect(left-5,top-7,right-left+10,12);c.strokeStyle='#afc7c0';c.lineWidth=2;c.strokeRect(left-5,top-7,right-left+10,12);
 if(LAW!=='gay'){c.fillStyle='#7f999b';c.fillRect(218,37,18,Math.max(2,top-43));c.fillStyle='#d9e5dc';c.fillRect(194,30,67,8);}
 c.font='11px system-ui';c.fillStyle='#c3d6cf';c.fillText(LAW==='gay'?'RECIPIENTE RÍGIDO':LAW==='charles'?'PISTÓN MÓVIL · PRESIÓN CONSTANTE':'PISTÓN · VOLUMEN DEL ESTADO',left,21);
 c.font='bold 16px system-ui';c.fillStyle='#e5f5e9';c.fillText('V = '+f(gas.V)+' L',left+12,bottom-13);
 // A pressure gauge, explicitly calculated from the equilibrium equation.
 const gx=506,gy=135,gr=53,maxP=5,ratio=Math.min(1,gas.P/maxP);
 c.strokeStyle='#628285';c.lineWidth=2;c.beginPath();c.arc(gx,gy,gr,Math.PI*.75,Math.PI*2.25);c.stroke();
 for(let i=0;i<=6;i++){const a=Math.PI*.75+1.5*Math.PI*i/6;c.strokeStyle='#8caaa7';c.lineWidth=1;c.beginPath();c.moveTo(gx+Math.cos(a)*(gr-5),gy+Math.sin(a)*(gr-5));c.lineTo(gx+Math.cos(a)*gr,gy+Math.sin(a)*gr);c.stroke();}
 const angle=Math.PI*.75+ratio*1.5*Math.PI;c.strokeStyle=color;c.lineWidth=3;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx+Math.cos(angle)*39,gy+Math.sin(angle)*39);c.stroke();c.fillStyle=color;c.beginPath();c.arc(gx,gy,5,0,2*Math.PI);c.fill();
 c.font='10px system-ui';c.fillStyle='#a7c5be';c.fillText('0',gx-43,gy+48);c.textAlign='right';c.fillText(f(maxP,0)+' atm',gx+49,gy+48);c.textAlign='center';c.font='bold 20px system-ui';c.fillStyle='#ebf8ee';c.fillText(f(gas.P)+' atm',gx,gy+82);c.font='10px system-ui';c.fillStyle='#b5ccc5';c.fillText('PRESIÓN ABSOLUTA',gx,gy+101);
 if(gas.P>maxP){c.fillStyle='#ffd097';c.fillText('Fuera de escala: usa el valor numérico',gx,gy+121);}
 c.fillStyle=color;c.globalAlpha=.35;c.fillRect(left-3,bottom+13,right-left+6,12);c.globalAlpha=1;c.textAlign='left';c.fillStyle='#d7e9dc';c.font='12px system-ui';c.fillText('T = '+f(gas.T,0)+' K  ·  '+f(gas.T-273.15,1)+' °C',left,349);c.fillStyle='#a8c6bc';c.font='11px system-ui';c.fillText('n = '+f(gas.n,3)+' mol',447,311);c.fillText('Muestra visual: '+visualParticles.length+' puntos',447,331);
}
function drawGraph(){
 const all=[...samples,gas],points=all.map(s=>gasPlotPoint(LAW,s,inversePlot));let xmax,ymax,curve,xlabel,ylabel;
 if(LAW==='boyle'){
  const k=GAS_DEFAULT.n*GAS_R*GAS_DEFAULT.T;
  if(inversePlot){xmax=Math.max(.5,...points.map(p=>p[0]))*1.08;ymax=k*xmax*1.1;curve=x=>k*x;xlabel='1/V (L⁻¹)';}
  else{xmax=Math.max(12,...points.map(p=>p[0]))*1.04;const lower=Math.max(.000001,Math.min(2,...all.map(s=>s.V)));ymax=Math.max(k/lower,...points.map(p=>p[1]))*1.13;curve=x=>x>0?k/x:0;xlabel='Volumen V (L)';}
  ylabel='Presión P (atm)';
 }
 if(LAW==='charles'){xmax=Math.max(650,...points.map(p=>p[0]*1.1));curve=x=>GAS_DEFAULT.n*GAS_R*x/GAS_DEFAULT.P;ymax=curve(xmax)*1.1;xlabel='Temperatura T (K)';ylabel='Volumen V (L)';}
 if(LAW==='gay'){xmax=Math.max(650,...points.map(p=>p[0]*1.1));curve=x=>GAS_DEFAULT.n*GAS_R*x/GAS_DEFAULT.V;ymax=curve(xmax)*1.1;xlabel='Temperatura T (K)';ylabel='Presión P (atm)';}
 if(LAW==='ideal'){xmax=Math.max(150,...points.map(p=>p[0]*1.18));curve=x=>GAS_R*x;ymax=curve(xmax)*1.1;xlabel='n · T (mol·K)';ylabel='P · V (L·atm)';}
 const l=68,r=598,t=31,b=277,px=x=>l+x/xmax*(r-l),py=y=>b-y/ymax*(b-t),color=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#087f73';
 let svg=`<title>Gráfica de ${CONFIG.title}</title><desc>${ylabel} frente a ${xlabel}. Curva calculada con el modelo ideal y puntos de los estados registrados.</desc><rect x="0" y="0" width="620" height="330" fill="#fffef9"/>`;
 for(let i=0;i<=5;i++){const x=l+(r-l)*i/5,y=b-(b-t)*i/5;svg+=`<path d="M${x} ${t}V${b} M${l} ${y}H${r}" fill="none" stroke="#e3e9df" stroke-width="1"/><text x="${x}" y="${b+19}" text-anchor="middle" font-size="10" fill="#657376">${f(xmax*i/5,xmax<2?2:0)}</text><text x="${l-9}" y="${y+3}" text-anchor="end" font-size="10" fill="#657376">${f(ymax*i/5,ymax<1?3:2)}</text>`;}
 svg+=`<path d="M${l} ${t}V${b}H${r}" fill="none" stroke="#6a7c7a" stroke-width="1.2"/><text x="${l}" y="17" font-size="11" fill="#536561">${ylabel}</text><text x="${(l+r)/2}" y="317" text-anchor="middle" font-size="11" fill="#536561">${xlabel}</text>`;
 let d='';const minimum=LAW==='boyle'&&!inversePlot?Math.max(.000001,Math.min(2,...all.map(s=>s.V))):0;
 for(let i=0;i<=140;i++){const x=minimum+(xmax-minimum)*i/140,y=curve(x);d+=(i?'L':'M')+px(x).toFixed(3)+' '+py(y).toFixed(3)+' ';}
 svg+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.7"/>`;
 for(let i=0;i<samples.length;i++){const [x,y]=gasPlotPoint(LAW,samples[i],inversePlot);svg+=`<circle cx="${px(x)}" cy="${py(y)}" r="4" fill="#fffef9" stroke="${color}" stroke-width="1.8"><title>Estado ${i+1}: ${f(x,3)}, ${f(y,4)}</title></circle>`;}
 const [cx,cy]=gasPlotPoint(LAW,gas,inversePlot);svg+=`<circle cx="${px(cx)}" cy="${py(cy)}" r="8" fill="${color}" opacity=".15"/><circle cx="${px(cx)}" cy="${py(cy)}" r="5" fill="${color}" stroke="#fffef9" stroke-width="1.5"><title>Estado actual</title></circle>`;
 $('graph').innerHTML=svg;
 if(LAW==='boyle'){$('plotMode').textContent=inversePlot?'Ver P frente a V':'Ver P frente a 1/V';$('graphDescription').textContent=inversePlot?'La recta muestra P = k·(1/V). Su pendiente es nRT. Los círculos vacíos son estados registrados; el punto lleno es el actual.':'La hipérbola muestra P = k/V. Los círculos vacíos son estados registrados; el punto lleno es el actual.';}
}
function renderTable(){
 $('tableBody').innerHTML=samples.map((s,i)=>`<tr><td>${i===0?'Inicial':`Estado ${i+1}`}</td><td>${f(s.P,4)}</td><td>${f(s.V,3)}</td><td>${f(s.T,2)}</td><td>${f(s.n,4)}</td><td>${f(gasInvariant(LAW,s),5)}</td></tr>`).join('');
 $('sampleCount').textContent=samples.length+' de 12 estados · valores calculados del modelo';
}
function refresh(){updateMetrics();syncParticles();drawScene();drawGraph();renderTable();}
function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
for(const k of ['P','V','T','n'])if($('slider'+k)){
 $('slider'+k).addEventListener('input',e=>setGasValue(k,+e.target.value));
 $('input'+k).addEventListener('input',e=>{const v=e.target.value.trim()===''?NaN:Number(e.target.value),bounds={P:[.001,100],V:[.05,200],T:[1,1500],n:[.001,2]}[k];if(Number.isFinite(v)&&v>=bounds[0]&&v<=bounds[1])setGasValue(k,v);});
 $('input'+k).addEventListener('change',e=>{setGasValue(k,+e.target.value);e.target.value=Number(gas[k].toPrecision(8));});
}
if($('solveFor'))$('solveFor').addEventListener('change',e=>{dependent=e.target.value;gas=gasSolve(LAW,gas,dependent);refresh();});
if($('plotMode'))$('plotMode').addEventListener('click',()=>{inversePlot=!inversePlot;drawGraph();});
$('saveState').addEventListener('click',()=>{if(samples.some(s=>['P','V','T','n'].every(k=>Math.abs(s[k]-gas[k])<1e-10))){notify('Este estado ya está registrado. Cambia una magnitud.');return;}if(samples.length===12){notify('Has alcanzado 12 estados. Descarga el CSV y borra los registros para seguir.');return;}samples.push({...gas});persistStates();refresh();notify('Estado registrado en la tabla y en la gráfica.');});
$('reset').addEventListener('click',()=>{dependent='P';if($('solveFor'))$('solveFor').value='P';gas=gasSolve(LAW);inversePlot=false;refresh();notify('Estado inicial restablecido. Se conservan tus registros.');});
$('clearStates').addEventListener('click',()=>{samples=[{...GAS_DEFAULT}];persistStates();refresh();notify('Cuaderno reiniciado con el estado inicial.');});
$('pause').addEventListener('click',()=>{paused=!paused;updateMetrics();drawScene();});
for(const key of ['T','V','n'])if($('double'+key))$('double'+key).addEventListener('click',()=>setGasValue(key,gas[key]*2));
if($('halfV'))$('halfV').addEventListener('click',()=>setGasValue('V',gas.V/2));
$('csv').addEventListener('click',()=>{const rows=[['Estado','P_atm','V_L','T_K','n_mol',CONFIG.invariantCSV],...samples.map((s,i)=>[i+1,s.P,s.V,s.T,s.n,gasInvariant(LAW,s)])];const csv='\ufeff'+rows.map(row=>row.map(v=>typeof v==='number'?v.toPrecision(11).replace('.',','):v).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=CONFIG.slug+'_datos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);});
$('tempC').addEventListener('input',e=>{const v=celsiusToKelvin(e.target.value.trim()===''?NaN:Number(e.target.value));if(Number.isFinite(v)&&v>=1&&v<=1500)setGasValue('T',v);});
$('pressureKpa').addEventListener('input',e=>{const v=e.target.value.trim()===''?NaN:Number(e.target.value)/101.325;if(Number.isFinite(v)&&v>=.001&&v<=100)setGasValue('P',v);});
$('tempC').addEventListener('change',e=>{setGasValue('T',celsiusToKelvin(e.target.value.trim()===''?NaN:Number(e.target.value)));e.target.value=Number((gas.T-273.15).toFixed(4));});
$('pressureKpa').addEventListener('change',e=>{setGasValue('P',e.target.value.trim()===''?NaN:Number(e.target.value)/101.325);e.target.value=Number(atmToKpa(gas.P).toFixed(4));});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('No se pudo activar la pantalla completa.');}});
document.addEventListener('visibilitychange',()=>{previousFrame=0;});
function animate(timestamp){if(!previousFrame)previousFrame=timestamp;const dt=Math.max(0,Math.min(.04,(timestamp-previousFrame)/1000));previousFrame=timestamp;if(!paused)drawScene(dt);requestAnimationFrame(animate);}
const lessons={
 boyle:{task:'Si reduces el volumen a la mitad manteniendo T y n, ¿cómo cambia la presión?',answer:'up',explain:'La presión se duplica: P₁V₁ = P₂V₂. Hay menos espacio y aumenta la frecuencia de choques con las paredes, con la misma energía cinética media.',hint:'Reinicia, anota P y V, pulsa V ÷ 2 y registra el nuevo estado. La temperatura y la cantidad de gas permanecen constantes.'},
 charles:{task:'Con presión y cantidad de gas constantes, si pasas de 300 K a 600 K, ¿cómo cambia el volumen?',answer:'up',explain:'El volumen se duplica: V/T permanece constante. Se duplica la temperatura absoluta, no la temperatura en °C.',hint:'Reinicia y pulsa T × 2. Compara los volúmenes y los cocientes V/T. ¿Se cumple también V/t si usas °C?'},
 gay:{task:'Con volumen y cantidad de gas constantes, si pasas de 300 K a 600 K, ¿cómo cambia la presión?',answer:'up',explain:'La presión se duplica: P/T permanece constante. El recipiente no se expande y las partículas transfieren más cantidad de movimiento a sus paredes.',hint:'Reinicia, registra el estado inicial y pulsa T × 2. Comprueba que V y n siguen iguales.'},
 ideal:{task:'Si duplicas el volumen manteniendo T y n, ¿cómo cambia la presión?',answer:'down',explain:'La presión se reduce a la mitad: P = nRT/V. Para esta prueba, elige P como incógnita y duplica V.',hint:'Elige calcular P y reinicia. Pulsa V × 2. Después prueba las otras incógnitas y comprueba que PV/(nT) sigue siendo R.'}
};
const courseNames={'2eso':'2.º ESO · Observar y explicar','3eso':'3.º ESO · Registrar y comparar','4eso':'4.º ESO · Interpretar la relación','1bach':'1.º Bachillerato · Cuantificar','2bach':'2.º Bachillerato · Repaso de gases'};
const advanced={'2eso':'Explica el resultado con palabras y un dibujo de partículas. Las fórmulas son un apoyo opcional.','3eso':'Registra al menos tres estados con unidades y compara los cocientes o productos de la ley.','4eso':'Justifica la forma de la gráfica y las variables que permanecen constantes. En Boyle, compara P–V y P–1/V.','1bach':'Calcula el resultado antes de comprobarlo; trabaja con kelvin, presión absoluta y unidades compatibles con R.','2bach':'Usa este modelo como repaso para problemas de Química. Analiza por qué falla cerca de la condensación o a alta densidad.'};
const requested=new URLSearchParams(location.search).get('curso');
if(courseNames[requested])$('course').value=requested;
else $('course').value=LAW==='ideal'?'1bach':'2eso';
function updateLesson(){const c=$('course').value,l=lessons[LAW];$('learningTitle').textContent=courseNames[c];$('learningTask').textContent=l.task;$('learningHint').textContent=l.hint+' '+advanced[c];$('prediction').value='';$('predictionFeedback').textContent='';$('worksheetLink').href='guia.html?curso='+c;document.documentElement.dataset.course=c;document.querySelectorAll('.law-nav a,.brand,footer a').forEach(a=>{const raw=a.getAttribute('href');if(raw&&!raw.startsWith('http'))a.setAttribute('href',raw.split('?')[0]+'?curso='+c);});}
$('course').addEventListener('change',updateLesson);
$('checkPrediction').addEventListener('click',()=>{const choice=$('prediction').value;if(!choice){$('predictionFeedback').textContent='Elige una predicción y después compruébala con los controles.';return;}const l=lessons[LAW];$('predictionFeedback').textContent=(choice===l.answer?'Tu predicción coincide con el modelo. ':'Revisa tu predicción con el experimento. ')+l.explain+' '+advanced[$('course').value];});
updateLesson();refresh();requestAnimationFrame(animate);

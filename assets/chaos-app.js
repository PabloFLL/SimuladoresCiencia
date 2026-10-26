'use strict';
(()=>{
 const P=Physics2D,V=ScienceView,E=Experiments2D,$=id=>document.getElementById(id),f=V.num,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let experiment=new E.ChaosExperiment({density:.16}),running=!reduced,overlay=false,last=0,accumulator=0,lastUI=0;
 const plot=new V.Plot($('plot'),$('legend'),$('chartReadout'));
 function sync(inputs=false){
  const p=experiment.params;
  if(inputs){$('count').value=p.N;$('mode').value=p.collisions?'collisions':'ideal';$('epsilon').value=p.angle;$('temperature').value=p.T;$('density').value=p.density;$('size').value=p.r;
   $('selected').innerHTML=Array.from({length:p.N},(_,i)=>'<option value="'+i+'">Partícula '+(i+1)+'</option>').join('');$('selected').value=p.selected;}
  $('temperatureOut').textContent=f(p.T);$('densityOut').textContent=f(p.density);$('sizeOut').textContent=f(p.r)+' u';
  $('play').textContent=running?'Pausar':experiment.finished?'Ensayo terminado':'Reproducir';$('play').setAttribute('aria-pressed',String(running));$('play').disabled=experiment.finished;
  $('overlay').textContent=overlay?'Separar universos':'Superponer';$('overlay').setAttribute('aria-pressed',String(overlay));$('worlds').classList.toggle('overlay',overlay);$('titleA').textContent=overlay?'A + B · Superposición':'Universo A';
  $('initialNote').textContent=(experiment.perturbed?'Universo B: giro de '+p.angle.toExponential(0)+' rad en la partícula '+(p.selected+1)+'.':'Sin perturbación: los dos estados iniciales son idénticos.')+' Misma energía inicial. Semilla '+p.seed+'.';
  $('seedLabel').textContent='Semilla reproducible: '+p.seed;
 }
 function reset(options={}){try{experiment.reset(options);accumulator=0;$('error').hidden=true;sync(true);refresh();render();}catch(error){running=false;$('error').hidden=false;$('error').textContent=error.message;sync();}}
 function prepare(patch){experiment.params={...experiment.params,...patch};reset();}
 function refresh(){
  const s=experiment.latest,p=experiment.params;
  for(const [id,t,e,pressure]of [['A',s.ta,s.ea,s.pa],['B',s.tb,s.eb,s.pb]]){$('temp'+id).textContent=f(t);$('energy'+id).textContent=f(e);$('pressure'+id).textContent=pressure===null?'midiendo…':f(pressure);}
  $('time').textContent=f(experiment.time);$('separation').textContent=s.d>0&&s.d<1e-5?(100*s.d).toExponential(2):f(s.d*100);
  $('discoveryText').textContent=!experiment.perturbed?'Sin perturbación, las trayectorias coinciden. Introduce δ para comparar.':!p.collisions?'Sin choques entre partículas, el giro diminuto produce diferencias pequeñas; esta caja rectangular no basta para generar caos.':s.d<.001?'Al principio, los universos parecen iguales. Los choques pueden amplificar la diferencia; sigue la partícula marcada y espera.':'Los detalles microscópicos divergen. Compara T y E: conservar estadísticas no exige conservar trayectorias.';
  $('horizonNote').textContent='Umbral elegido: '+f(experiment.threshold*100)+' % de la diagonal. '+(experiment.crossing===null?'Aún no se ha cruzado en este ensayo.':'Primer cruce observado en t* = '+f(experiment.crossing)+'.')+' Es una tolerancia educativa, no un límite físico universal.';
  const g=P.growth(experiment.history);
  $('growthNote').textContent=g?'Entre t* = '+f(g.start)+' y '+f(g.end)+', log D es compatible con un tramo aproximadamente recto: tasa efectiva '+f(g.slope)+' por t*, R² = '+f(g.r2)+'. No es una medida certificada del exponente de Lyapunov.':'No se identifica un tramo exponencial suficientemente claro en la ventana analizada. La separación puede crecer, fluctuar y finalmente saturarse en esta caja finita.';
  updatePlot();
 }
 function updatePlot(){
  const h=experiment.history,type=$('chartType').value,series=[],add=(name,color,key,extra={})=>series.push({name,color,points:h.map(p=>({x:p.t,y:key==='d'?p.d*100:p[key]})),...extra});
  let options={xLabel:'Tiempo t*',caption:'Cursor o flechas izquierda y derecha: consulta muestras reales del motor.'};
  if(type==='separation'){
   add('Separación RMS','#397eaf','d');series.push({name:'Umbral educativo',color:'#ba8654',dash:true,points:[{x:0,y:experiment.threshold*100},{x:Math.max(.2,experiment.time),y:experiment.threshold*100}]});
   options={...options,yLabel:'D · % de la diagonal',log:$('logScale').checked};$('chartNote').textContent='Distancia RMS entre partículas correspondientes. Los ceros no se dibujan en escala logarítmica. El umbral es una convención. Al alcanzar el tamaño de la caja, la separación deja de crecer indefinidamente.';
  }else{
   const prefix={temperature:'t',pressure:'p',energy:'e'}[type];add('Universo A','#397eaf',prefix+'a');add('Universo B','#d18149',prefix+'b');
   options.yLabel={temperature:'Temperatura cinética T*',pressure:'Presión 2D P*',energy:'Energía total K*'}[type];
   $('chartNote').textContent=type==='pressure'?'Presión real de paredes, media móvil de hasta 4 t*. Las fluctuaciones son grandes en muestras pequeñas; no se fuerza la coincidencia de ambas curvas.':'En este sistema aislado de discos elásticos, E = K permanece constante. T* = K/N: ambos universos conservan la misma energía inicial dentro del redondeo numérico.';
  }
  $('logScale').parentElement.hidden=type!=='separation';plot.set(series,options);
 }
 function render(){
  const e=experiment,flags={viewW:e.W,viewH:e.H,selected:e.params.selected,vectors:$('vectors').checked},trail=$('trails').checked;
  V.draw($('sceneA'),e.A,{...flags,color:V.colors.blue,trail:trail?e.trailsA:null,overlay:overlay?e.B:null,trailB:trail?e.trailsB:null});
  if(!overlay)V.draw($('sceneB'),e.B,{...flags,color:V.colors.orange,trail:trail?e.trailsB:null});
 }
 $('mode').addEventListener('change',e=>prepare({collisions:e.target.value==='collisions'}));
 $('epsilon').addEventListener('change',e=>{experiment.perturbed=true;prepare({angle:+e.target.value});});
 $('selected').addEventListener('change',e=>prepare({selected:+e.target.value}));
 $('count').addEventListener('change',e=>prepare({N:+e.target.value,selected:Math.min(experiment.params.selected,+e.target.value-1)}));
 for(const [id,key]of [['temperature','T'],['density','density'],['size','r']])$(id).addEventListener('input',e=>prepare({[key]:+e.target.value}));
 $('threshold').addEventListener('change',e=>{experiment.setThreshold(+e.target.value);refresh();});
 $('play').addEventListener('click',()=>{running=!running;accumulator=0;sync();});
 $('identical').addEventListener('click',()=>{running=!reduced;reset({perturbed:false});});
 $('perturb').addEventListener('click',()=>{running=!reduced;reset({perturbed:true});});
 $('reset').addEventListener('click',()=>reset({perturbed:true}));
 $('newSeed').addEventListener('click',()=>reset({seed:crypto.getRandomValues(new Uint32Array(1))[0]}));
 $('defaults').addEventListener('click',()=>{experiment=new E.ChaosExperiment({density:.16});$('speed').value=4;$('threshold').value=.05;running=!reduced;accumulator=0;sync(true);refresh();});
 $('overlay').addEventListener('click',()=>{overlay=!overlay;sync();render();});
 $('showDivergence').addEventListener('click',()=>{$('chartType').value='separation';refresh();$('chartPanel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});$('plot').focus({preventScroll:true});});
 for(const id of ['chartType','logScale'])$(id).addEventListener('change',refresh);
 for(const id of ['vectors','trails'])$(id).addEventListener('change',render);
 $('fullscreen').addEventListener('click',async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='Usa el zoom del navegador';}});
 document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;});
 function frame(now){const elapsed=last?Math.min(.08,(now-last)/1000):0;last=now;
  if(running&&!document.hidden){accumulator=Math.min(1,accumulator+elapsed*Number($('speed').value));let n=0;try{while(accumulator>=.04&&n++<50&&!experiment.finished){experiment.step();accumulator-=.04;}}catch(error){running=false;$('error').hidden=false;$('error').textContent=error.message;sync();}if(experiment.finished){running=false;sync();}}
  if(now-lastUI>180){refresh();lastUI=now;}render();requestAnimationFrame(frame);
 }
 sync(true);refresh();render();requestAnimationFrame(frame);
})();

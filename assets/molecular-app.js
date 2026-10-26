'use strict';
(()=>{
 const P=Physics2D,V=ScienceView,E=Experiments2D,$=id=>document.getElementById(id),f=V.num;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let experiment=new E.MolecularExperiment(),running=!reduced,accumulator=0,last=0,lastUI=0;
 const plot=new V.Plot($('plot'),$('legend'),$('chartReadout'));
 const presets={
  ideal:{N:24,W:24,T:3.5,sigma:1,attraction:1.5},
  attractions:{N:24,W:24,T:.4,sigma:1,attraction:1.5},
  compression:{N:48,W:24,T:1.8,sigma:1,attraction:.5},
  failure:{N:64,W:12,T:2,sigma:1.1,attraction:.4}
 };
 let experimentLabel='Explora temperatura, atracción y compresión.',activePreset='';
 function fail(error){running=false;$('error').hidden=false;$('error').textContent=error.message+' Puedes repetir el ensayo o recuperar los valores iniciales.';sync();}
 function fresh(params={},seed=experiment.params.seed){
  try{const next=new E.MolecularExperiment({...experiment.params,...params,seed});next.thermostat=$('thermostat').checked;experiment=next;accumulator=0;$('error').hidden=true;sync(true);refresh();}catch(error){fail(error);}
 }
 function sync(inputs=false){
  const p=experiment.params;
  if(inputs){$('temperature').value=p.T;$('area').value=experiment.targetW*p.H;$('attraction').value=p.attraction;$('count').value=p.N;$('size').value=p.sigma;$('thermostat').checked=experiment.thermostat;}
  $('temperatureOut').textContent=f(p.T);$('areaOut').textContent=f(experiment.targetW*p.H)+' u²';$('attractionOut').textContent=f(p.attraction);$('sizeOut').textContent=f(p.sigma)+' u';
  $('play').textContent=running?'Pausar':'Reproducir';$('play').setAttribute('aria-pressed',String(running));
  for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===activePreset));
 }
 function refresh(){
  const a=experiment.A.stats(),b=experiment.B.stats(),s=experiment.latest,p=experiment.params,area=experiment.A.W*p.H;
  for(const [id,stats,pressure]of [['A',a,s.pa],['B',b,s.pb]]){$('temp'+id).textContent=f(stats.T);$('pressure'+id).textContent=pressure===null?'midiendo…':f(pressure);$('energy'+id).textContent=f(stats.E);}
  $('time').textContent=f(experiment.steps*.0005);
  const moving=Math.abs(experiment.targetW-experiment.A.W)>.01;
  $('processNote').textContent=(moving?'Émbolo en movimiento: A* = '+f(area)+' → '+f(experiment.targetW*p.H)+'. ':'A* = '+f(area)+' u². ')+(experiment.thermostat?'T regulada: hay intercambio de calor.':'Sin termostato: el gas intercambia trabajo solo si se mueve la pared.');
  const group=V.cluster(experiment.B.p,p.sigma);$('clusterValue').innerHTML=group+' / '+p.N+'<small>Mayor grupo de vecinos · derecha</small>';
  $('discoveryText').textContent=experimentLabel+' '+(p.attraction===0?'No hay atracción: la repulsión entre partículas sigue actuando.':p.T<.65?'A baja T*, observa si los encuentros duran más y se forman grupos. Un grupo de vecinos no demuestra por sí solo una fase líquida.':area<170?'Al comprimir, las partículas del gas con interacciones disponen de menos espacio libre.':'Activa fuerzas o rastros para comparar cómo cambian las trayectorias.');
  const eq=P.eos(p.N,b.T,area,p.sigma,p.attraction);
  $('parameters').textContent='Referencia 2D actual: a = '+f(eq.a)+', b = '+f(eq.b)+'; N = '+p.N+'. Semilla: '+p.seed+'.';
  $('balance').textContent='Derecha: E − E₀ − W − Q = '+b.balance.toExponential(2)+'; W = '+f(experiment.B.work)+'; Q = '+f(experiment.B.heat)+'. La energía cinética y potencial del gráfico proceden del motor.';
  updatePlot(a,b);
 }
 function updatePlot(a,b){
  const p=experiment.params,h=experiment.history,s=experiment.latest,kind=$('chartType').value,raw=$('rawPressure').checked,series=[];
  const add=(name,color,points,extra={})=>series.push({name,color,points,...extra});
  let options,note='';
  if(kind==='pv'){
   const min=144,max=288,grid=Array.from({length:130},(_,i)=>min+(max-min)*i/129);
   add('Ideal · teoría','#087f75',grid.map(A=>({x:A,y:p.N*a.T/A})),{dash:true});
   add('Van der Waals 2D · teoría','#bd7040',grid.map(A=>({x:A,y:P.eos(p.N,b.T,A,p.sigma,p.attraction).vdw})),{dash:true});
   add('Ideal · paredes','#0f8278',[{x:experiment.A.W*p.H,y:s.pa}],{dots:true});
   add('Interacciones · paredes','#d18c54',[{x:experiment.B.W*p.H,y:s.pb}],{dots:true});
   options={xLabel:'Área A* · volumen en 2D',yLabel:'Presión 2D P*',xRange:[min-4,max+4],caption:'Líneas: ecuaciones a la T cinética actual de cada gas. Puntos: impulso medido, media móvil de hasta 3 t*.'};
   note='Mueve el émbolo para explorar estados. La curva de Van der Waals no es un ajuste de la dinámica molecular. '+(P.eos(p.N,b.T,experiment.A.W*p.H,p.sigma,p.attraction).vdw<0?'La predicción actual es negativa: esta rama homogénea no describe un gas en equilibrio estable.':'Las ramas con dP/dA ≥ 0 son mecánicamente inestables; la ecuación homogénea no resuelve la coexistencia de fases.');
  }else if(kind==='pressure'){
   add('Ideal · '+(raw?'medida por intervalos':'media móvil'),'#087f75',h.map(v=>({x:v.t,y:raw?v.rawa:v.pa})));
   add('Interacciones · '+(raw?'medida por intervalos':'media móvil'),'#d18c54',h.map(v=>({x:v.t,y:raw?v.rawb:v.pb})));
   add('Ideal · NT/A','#347b88',h.map(v=>({x:v.t,y:v.ideal})),{dash:true});add('Van der Waals 2D · teoría','#98562f',h.map(v=>({x:v.t,y:v.vdw})),{dash:true});
   options={xLabel:'Tiempo t*',yLabel:'Presión 2D P*',caption:raw?'Presión medida en intervalos de 0,25 t*. No se suaviza.':'Medidas de paredes: media móvil de hasta 3 t*. Las curvas discontinuas son predicciones instantáneas.'};note='Durante una compresión o tras cambiar T*, el sistema puede estar fuera del equilibrio. No se exige que una ecuación de equilibrio siga esos transitorios.';
  }else if(kind==='energy'){
   add('Cinética K','#347b88',h.map(v=>({x:v.t,y:v.K})));add('Potencial U','#c38b4a',h.map(v=>({x:v.t,y:v.U})));add('Total E · derecha','#6d689e',h.map(v=>({x:v.t,y:v.E})));add('E₀ + W + Q','#91a66a',h.map(v=>({x:v.t,y:v.expected})),{dash:true});
   options={xLabel:'Tiempo t*',yLabel:'Energía reducida',caption:'Energías reales del gas con interacciones. Discontinua: balance esperado a partir del calor y el trabajo registrados.'};note='Con paredes fijas y termostato desactivado, E debe mantenerse aproximadamente constante. Con termostato, pared móvil o cambio de λ, el gas intercambia energía.';
  }else{
   const all=[...experiment.A.p,...experiment.B.p],vmax=Math.max(3,...all.map(q=>Math.hypot(q.vx,q.vy)))*1.05,bins=18,dv=vmax/bins;
   for(const [g,label,color,T]of [[experiment.A,'Ideal','#087f75',a.T],[experiment.B,'Interacciones','#c5814d',b.T]]){
    const counts=Array(bins).fill(0);for(const q of g.p)counts[Math.min(bins-1,Math.floor(Math.hypot(q.vx,q.vy)/dv))]++;
    add(label+' · muestra',color,counts.map((n,i)=>({x:(i+.5)*dv,y:n/(p.N*dv)})));
    add(label+' · Maxwell 2D',color,Array.from({length:100},(_,i)=>{const v=i*vmax/99;return{x:v,y:v/T*Math.exp(-v*v/(2*T))};}),{dash:true});
   }
   options={xLabel:'Rapidez |v|*',yLabel:'Densidad de probabilidad',xRange:[0,vmax],caption:'Frecuencias en 18 intervalos, unidas para facilitar la lectura. Referencia: f(v) = (v/T*) exp(−v²/2T*) en 2D.'};note='Las líneas sólidas son una muestra instantánea pequeña. El termostato de reescalado no genera una distribución canónica exacta; se muestran fluctuaciones reales, no datos inventados.';
  }
  $('rawPressure').parentElement.hidden=kind!=='pressure';$('chartNote').textContent=note;plot.set(series,options);
 }
 function render(){
  const flags={viewW:24,viewH:12,piston:true,vectors:$('vectors').checked,forces:$('forces').checked,speedColors:$('speedColors').checked,selected:$('trails').checked?0:-1};
  V.draw($('sceneA'),experiment.A,{...flags,color:V.colors.a,trail:$('trails').checked?experiment.trailsA:null});
  V.draw($('sceneB'),experiment.B,{...flags,color:V.colors.b,trail:$('trails').checked?experiment.trailsB:null});
 }
 function changed(){activePreset='';experimentLabel='';sync();refresh();render();}
 $('temperature').addEventListener('input',e=>{experiment.setTemperature(+e.target.value);changed();});
 $('area').addEventListener('input',e=>{experiment.setWidth(+e.target.value/experiment.params.H);changed();});
 $('attraction').addEventListener('input',e=>{experiment.setAttraction(+e.target.value);changed();});
 $('count').addEventListener('change',e=>{activePreset='';fresh({N:+e.target.value,W:experiment.targetW});});
 $('size').addEventListener('input',e=>{activePreset='';fresh({sigma:+e.target.value,W:experiment.targetW});});
 $('thermostat').addEventListener('change',e=>{experiment.thermostat=e.target.checked;sync();refresh();});
 $('play').addEventListener('click',()=>{running=!running;accumulator=0;sync();});
 $('reset').addEventListener('click',()=>fresh());
 $('newSeed').addEventListener('click',()=>fresh({},crypto.getRandomValues(new Uint32Array(1))[0]));
 $('defaults').addEventListener('click',()=>{experiment=new E.MolecularExperiment();$('thermostat').checked=true;activePreset='';experimentLabel='Explora temperatura, atracción y compresión.';running=!reduced;accumulator=0;$('error').hidden=true;sync(true);refresh();});
 for(const button of document.querySelectorAll('[data-preset]'))button.addEventListener('click',()=>{
  activePreset=button.dataset.preset;experimentLabel={ideal:'Alta temperatura y baja densidad: busca semejanzas.',attractions:'Misma preparación que «Casi ideal», con T* más baja: compara la relevancia de la atracción.',compression:'Compresión progresiva: la pared se mueve y realiza trabajo.',failure:'Gas denso: el espacio excluido hace importante la corrección a la ley ideal.'}[activePreset];
  $('thermostat').checked=true;fresh(presets[activePreset],8251);if(activePreset==='compression'){experiment.setWidth(12);sync(true);}running=!reduced;sync();
 });
 for(const id of ['chartType','rawPressure'])$(id).addEventListener('change',()=>refresh());
 for(const id of ['vectors','forces','trails','speedColors'])$(id).addEventListener('change',render);
 $('fullscreen').addEventListener('click',async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='Usa el zoom del navegador';}});
 document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;});
 function frame(now){
  const elapsed=last?Math.min(.08,(now-last)/1000):0;last=now;
  if(running&&!document.hidden){accumulator=Math.min(.5,accumulator+elapsed*Number($('speed').value));let n=0;try{while(accumulator>=.0005&&n++<300){experiment.step();accumulator-=.0005;}}catch(error){fail(error);}}
  if(now-lastUI>200){refresh();lastUI=now;}render();requestAnimationFrame(frame);
 }
 sync(true);refresh();render();requestAnimationFrame(frame);
})();

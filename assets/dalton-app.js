'use strict';
(()=>{
 const D=DaltonModel,V=DaltonView,$=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let gas=D.presets.add(),running=!reduced,last=0,accumulator=0,lastUI=0,actionMessage='',challengeReady=false;
 const charts=new V.Charts($('plot'),$('legend'),$('chartReadout'),$('chartNote'));
 const format=(n,d=2)=>Number(n.toPrecision(13)).toLocaleString('es-ES',{maximumFractionDigits:d});
 const pressure=n=>n===null?'midiendo…':format(n*($('units').value==='atm'?1/101.325:1),$('units').value==='atm'?4:2)+' '+$('units').value;
 function fail(error){running=false;$('error').hidden=false;$('error').textContent=error.message+' Reinicia o elige otro experimento.';sync();}
 function guard(fn){return()=>{try{fn();}catch(error){fail(error);}};}
 function invalidateChallenge(){if(challengeReady){challengeReady=false;$('prediction').value='';$('checkPrediction').disabled=true;$('challengeFeedback').textContent='Has cambiado la preparación. Pulsa «Preparar reto» para recuperar sus condiciones iniciales.';}}
 function sync(inputs=false){
  const s=gas.stats(),air=gas.mode==='air';
  for(let i=0;i<3;i++){
   const range=$('amount'+i);range.disabled=air||gas.partition&&i===2;range.max=Math.max(.8,Math.ceil(gas.n[i]*10)/10);range.step=air?'any':'.02';if(inputs)range.value=gas.n[i];
   $('amount'+i+'Out').textContent=format(gas.n[i],air?5:2)+' mol';$('count'+i).textContent=s.counts[i]+' puntos representativos'+(range.disabled&&air?' · proporción de aire fija':'');
  }
  if(inputs){$('temperature').value=gas.T;$('volume').value=gas.V;}
  $('temperatureOut').textContent=format(gas.T,0)+' K';$('volumeOut').textContent=format(gas.V)+' L';
  $('play').textContent=running?'Pausar':'Reproducir';$('play').setAttribute('aria-pressed',String(running));
  $('additionActions').hidden=air||gas.mode==='mix';$('partitionActions').hidden=gas.mode!=='mix';$('removePartition').disabled=!gas.partition;$('removePartition').textContent=gas.partition?'Retirar la pared y mezclar los gases':'Pared retirada · volumen compartido';
  $('addOxygen').disabled=gas.n[1]>=.8-1e-8;$('addArgon').disabled=gas.n[2]>=.8-1e-8;
  $('traceRow').hidden=gas.n[3]===0;$('traceToggle').hidden=gas.n[3]===0;$('airBox').hidden=!air;
  if(air){$('airPressure').min=Math.min(10,s.total);$('airPressure').max=Math.max(150,Math.ceil(s.total/50)*50);$('airPressure').value=s.total;$('airPressureOut').textContent=pressure(s.total);}
  for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===gas.mode));
 }
 function refresh(){
  const s=gas.stats(),measuredTotal=gas.partition||s.measured.some(v=>v===null)?null:s.measured.reduce((a,b)=>a+b,0),air=gas.mode==='air';
  $('time').textContent=format(gas.time*1000,3);
  for(let i=0;i<4;i++){
   $('partial'+i).textContent=pressure(s.partial[i]);$('measured'+i).textContent=(s.measured[i]!==null&&gas.n[i]>0?'≈ ':'')+pressure(s.measured[i]);
   if(i<3)$('rms'+i).textContent=s.rms[i]===null?'—':format(s.rms[i],0)+' m/s';
   document.querySelectorAll('.gas-pressure')[i].classList.toggle('focused-pressure',$('impactFilter').value===String(i));
  }
  $('pressureMode').textContent=(gas.partition?'Presiones locales · V/2. ':'Lectura principal: teoría. ')+'Impactos: promedio de '+format(s.averagingTime*1000,2)+' ms.';
  $('totalLabel').textContent=gas.partition?'COMPARTIMENTOS SEPARADOS':'PRESIÓN TOTAL · TEORÍA';$('totalValue').textContent=gas.partition?'—':pressure(s.total);
  $('totalMeasured').textContent=gas.partition?'No hay una presión única de mezcla.':'Impactos: '+pressure(measuredTotal);
  $('stackArea').hidden=gas.partition;
  const scale=Math.max(200,Math.ceil((s.total||0)/200)*200);
  for(let i=0;i<4;i++)$('segment'+i).style.width=(gas.partition?0:s.partial[i]/scale*100)+'%';
  $('stackCaption').textContent='Escala completa: '+pressure(scale)+'. Lecturas redondeadas.';$('stack').setAttribute('aria-label',D.species.map((sp,i)=>sp.name+': '+pressure(s.partial[i])).join('; '));
  $('sceneLabel').textContent=gas.partition?'Dos compartimentos · cada uno de '+format(gas.V/2)+' L':'Volumen compartido: '+format(gas.V)+' L';
  $('samplingNote').textContent=s.counts.reduce((a,b)=>a+b,0)+' puntos en el motor. Cada punto representa muchas moléculas; la cantidad real se lee en mol.'+(air?' En aire los pesos difieren: los porcentajes exactos están en las barras.':'');
  $('mixComparison').hidden=gas.mode!=='mix';
  if(gas.mode==='mix'){
   if(gas.partition)$('mixComparison').textContent='Antes: N₂ = '+pressure(s.partial[0])+' y O₂ = '+pressure(s.partial[1])+' en '+format(gas.V/2)+' L cada uno. Tras retirar la pared, a la misma T y con las mismas cantidades, sus presiones parciales de equilibrio serán '+pressure(s.future[0])+' y '+pressure(s.future[1])+' en '+format(gas.V)+' L.';
   else $('mixComparison').textContent='Justo antes de retirar la pared: N₂ = '+pressure(gas.initialLocal?.[0]??0)+' y O₂ = '+pressure(gas.initialLocal?.[1]??0)+' en '+format((gas.initialMixV||gas.V)/2)+' L cada uno. Ahora ambos disponen de '+format(gas.V)+' L: sus presiones parciales previstas son '+pressure(s.partial[0])+' y '+pressure(s.partial[1])+'. La mezcla evoluciona sin cambiar las velocidades al retirar la pared.';
  }
  $('airExplanation').textContent='Oxígeno: x = 0,2095 (20,95 %). P_O₂ = 0,2095 × '+pressure(s.total)+' = '+pressure(s.partial[1])+'. Al bajar la presión total, también baja P_O₂ aunque su porcentaje permanezca igual.';
  $('contextNote').textContent=!s.nTotal?'Recipiente vacío. Añade un gas para empezar; la temperatura indicada es el ajuste térmico.':actionMessage|| (gas.partition?'Los gases aún ocupan volúmenes diferentes. Retira la pared para observar cómo exploran el recipiente completo.':gas.mode==='masses'?'A la misma temperatura, N₂ tiene mayor rapidez típica que Ar. Con las mismas cantidades, su presión parcial es igual: el efecto de la masa compensa el de la rapidez.':'Cada gas contribuye a la presión total como si los otros gases ideales no estuvieran presentes, siempre que se mantengan la misma temperatura y el mismo volumen.');
  if(gas.mode==='masses'&&Math.abs(gas.n[0]-gas.n[2])>1e-10)$('contextNote').textContent='Las masas siguen determinando distintas rapideces. Para comparar presiones iguales, iguala las cantidades de N₂ y Ar a la misma T y V.';
  $('calculation').textContent=!s.nTotal?'En el vacío no se definen fracciones molares. Añade al menos una especie.':gas.partition?'Con la pared, N₂ y O₂ tienen cada uno V/2. Se calcula su presión local por separado. La relación Pᵢ = xᵢP_total se aplicará después a la mezcla que ocupe V_total.':'n_total = '+format(s.nTotal,5)+' mol. Para el oxígeno: x_O₂ = '+format(gas.n[1],5)+' / '+format(s.nTotal,5)+' = '+format(s.x[1],5)+'. El oxígeno aporta el '+format(s.x[1]*100,2)+' % de la cantidad de gas y el '+format(s.x[1]*100,2)+' % de la presión: P_O₂ = '+format(s.x[1],5)+' × '+pressure(s.total)+' = '+pressure(s.partial[1])+'. Cálculo directo: '+format(gas.n[1],5)+' mol × '+format(D.R*($('units').value==='atm'?1/101.325:1),8)+' '+$('units').value+'·L/(mol·K) × '+format(gas.T,0)+' K / '+format(gas.V)+' L = '+pressure(s.partial[1])+'.';
  const type=$('chartType').value;$('measurement').parentElement.hidden=type!=='time';$('curveToggles').hidden=type==='bars'||type==='fractions';$('curve4').parentElement.hidden=type==='speed';
  charts.update(gas,{type,measurement:$('measurement').value,unit:$('units').value,visible:Array.from({length:5},(_,i)=>$('curve'+i).checked)});
 }
 function render(){V.draw($('scene'),gas,{filter:$('speciesFilter').value,hitFilter:$('impactFilter').value,trails:$('trails').checked,impacts:$('impacts').checked});}
 function changed(){actionMessage='';invalidateChallenge();sync(true);refresh();render();}
 function loadPreset(name){gas=D.presets[name]();running=!reduced;accumulator=0;actionMessage='';invalidateChallenge();$('speciesFilter').value='all';$('impactFilter').value='all';$('chartType').value=name==='masses'?'speed':name==='air'?'fractions':'time';for(let i=0;i<5;i++)$('curve'+i).checked=true;$('error').hidden=true;sync(true);refresh();render();}
 for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',guard(()=>loadPreset(b.dataset.preset)));
 for(let i=0;i<3;i++)$('amount'+i).addEventListener('input',guard(()=>{if(gas.mode==='mix'&&!gas.partition&&i===2)gas.mode='custom';gas.setAmount(i,Number($('amount'+i).value));changed();}));
 $('temperature').addEventListener('input',guard(()=>{gas.setTemperature(Number($('temperature').value));changed();}));
 $('volume').addEventListener('input',guard(()=>{gas.setVolume(Number($('volume').value));changed();}));
 for(const [id,index,increment]of [['addOxygen',1,.2],['addArgon',2,.1]])$(id).addEventListener('click',guard(()=>{
  const before=gas.stats();gas.setAmount(index,Math.min(.8,Number((gas.n[index]+increment).toFixed(8))));invalidateChallenge();const after=gas.stats();
  actionMessage='Añadido '+D.species[index].name+': P_N₂ se mantiene en '+pressure(after.partial[0])+' (antes '+pressure(before.partial[0])+'). La presión total pasa de '+pressure(before.total)+' a '+pressure(after.total)+'.';sync(true);refresh();render();
 }));
 $('removePartition').addEventListener('click',guard(()=>{gas.removePartition();changed();}));
 $('airPressure').addEventListener('input',guard(()=>{const P=Number($('airPressure').value),n=P*gas.V/(D.R*gas.T);gas.setAmounts(D.airFractions.map(x=>x*n));changed();}));
 $('play').addEventListener('click',()=>{running=!running;accumulator=0;sync();});
 $('reset').addEventListener('click',guard(()=>{const partition=gas.mode==='mix';gas=new D.Mixture({n:gas.n.slice(),T:gas.T,V:gas.V,seed:gas.seed,partition,mode:gas.mode});accumulator=0;actionMessage='';invalidateChallenge();$('error').hidden=true;sync(true);refresh();render();}));
 for(const id of ['units','chartType','measurement',...Array.from({length:5},(_,i)=>'curve'+i)])$(id).addEventListener('change',()=>{sync();refresh();});
 for(const id of ['speciesFilter','impactFilter','trails','impacts'])$(id).addEventListener('change',()=>{refresh();render();});
 function challenge(){return D.challenges.find(c=>c.id===$('challenge').value);}
 function question(){const c=challenge();$('challengeQuestion').textContent=c.question;$('prediction').innerHTML='<option value="">Elige tu predicción…</option>'+c.options.map((text,i)=>'<option value="'+i+'">'+text+'</option>').join('');$('checkPrediction').disabled=true;challengeReady=false;$('challengeFeedback').textContent='Pulsa «Preparar reto» para fijar sus condiciones iniciales.';}
 $('challenge').addEventListener('change',question);
 $('prepareChallenge').addEventListener('click',guard(()=>{const c=challenge();gas=new D.Mixture({n:c.n,mode:'challenge'});running=false;accumulator=0;actionMessage='Reto preparado: observa el estado inicial y elige una predicción.';challengeReady=true;$('prediction').value='';$('checkPrediction').disabled=true;$('challengeFeedback').textContent='Estado preparado a 300 K y 10 L. El experimento se ejecutará después de tu predicción.';sync(true);refresh();render();}));
 $('prediction').addEventListener('change',()=>{$('checkPrediction').disabled=!challengeReady||$('prediction').value==='';});
 $('checkPrediction').addEventListener('click',guard(()=>{
  if(!challengeReady||$('prediction').value==='')return;
  const c=challenge(),prediction=Number($('prediction').value),r=D.runChallenge(gas,c.id);challengeReady=false;$('checkPrediction').disabled=true;
  const correct=prediction===r.answer;
  const observed=c.id==='mass'?'El motor da P_N₂ = '+pressure(r.after.partial[0])+' y P_Ar = '+pressure(r.after.partial[2])+', con rapideces RMS de '+format(r.after.rms[0],0)+' y '+format(r.after.rms[2],0)+' m/s.':(c.id==='volume'?'Para cada especie, la presión se multiplica por '+format(r.ratio)+'. Ejemplo, N₂: ':D.species[r.key].name+': ')+pressure(r.before.partial[r.key])+' → '+pressure(r.after.partial[r.key])+'.';
  $('challengeFeedback').textContent=(correct?'Tu predicción coincide con el resultado. ':'Compara tu predicción con el cambio observado. ')+observed+' Consulta ahora la presión medida por impactos mientras evoluciona el gas.';
  actionMessage=observed;running=!reduced;sync(true);refresh();render();
 }));
 $('fullscreen').addEventListener('click',async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{$('fullscreen').textContent='Usa el zoom del navegador';}});
 document.addEventListener('visibilitychange',()=>{last=0;accumulator=0;});
 function frame(now){
  const elapsed=last?Math.min(.08,(now-last)/1000):0;last=now;
  if(running&&!document.hidden){accumulator=Math.min(.0004,accumulator+elapsed*.0002*Number($('speed').value));let steps=0;try{while(accumulator>=D.DT&&steps++<120){gas.step();accumulator-=D.DT;}}catch(error){fail(error);}}
  if(now-lastUI>180){refresh();lastUI=now;}render();requestAnimationFrame(frame);
 }
 question();sync(true);refresh();render();requestAnimationFrame(frame);
})();

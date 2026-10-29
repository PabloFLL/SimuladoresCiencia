(function(){
 'use strict';
 const $=id=>document.getElementById(id),S=StatesModel,states=['solid','liquid','gas'];
 let lab=new S.Laboratory(),playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,last=performance.now(),accumulator=0;
 const view=new StatesView.Renderer(states.map($)),options={grid:false,trails:false};
 function draw(){view.draw(lab,options);}
 function readings(){for(let i=0;i<3;i++){const state=states[i],a=S.stats(lab.worlds[i]);$(state+'Count').textContent=a.count;$(state+'Density').textContent=i===0?'1':i===2?'1/'+(S.COUNTS.solid/a.count):a.relative.toLocaleString('es-ES',{maximumFractionDigits:3});$(state+'Bar').style.width=(a.relative*100)+'%';} $('gasRatio').textContent=S.COUNTS.liquid/S.COUNTS.gas;}
 function transport(){$('play').textContent=playing?'Pausar':'Reproducir';$('play').setAttribute('aria-pressed',String(playing));}
 $('play').addEventListener('click',()=>{playing=!playing;accumulator=0;last=performance.now();transport();});
 $('reset').addEventListener('click',()=>{lab=new S.Laboratory();speed=1;$('speed').value='1';options.grid=false;options.trails=false;$('grid').checked=false;$('trails').checked=false;$('gridNote').hidden=true;$('error').hidden=true;playing=!matchMedia('(prefers-reduced-motion: reduce)').matches;accumulator=0;last=performance.now();readings();transport();draw();});
 $('speed').addEventListener('change',e=>{speed=Number(e.target.value);accumulator=0;last=performance.now();});
 $('grid').addEventListener('change',e=>{options.grid=e.target.checked;$('gridNote').hidden=!options.grid;draw();});
 $('trails').addEventListener('change',e=>{options.trails=e.target.checked;lab.clearTrails();draw();});
 document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;});
 new ResizeObserver(draw).observe($('solid').parentElement);
 function frame(now){const elapsed=Math.min(.05,(now-last)/1000);last=now;
  if(playing&&!document.hidden){try{accumulator+=elapsed*speed*.18;let steps=0;while(accumulator>=S.STEP&&steps<16){lab.step();accumulator-=S.STEP;steps++;}/* Bound work after a stalled frame. Never enlarge the physical timestep. */if(steps===16)accumulator=0;draw();}catch(error){playing=false;transport();$('error').textContent='La animación se ha detenido. Pulsa Reiniciar para recuperar el estado inicial.';$('error').hidden=false;}}
  requestAnimationFrame(frame);
 }
 readings();transport();draw();requestAnimationFrame(frame);
})();

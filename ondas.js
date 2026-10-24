'use strict';
let wave={A:1,f:.5,v:2},t=0,running=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=0;
const {$,format}=Lab;
function draw(){
  const p=waveProperties(wave),y=waveY(wave,3,t),phase=t%p.period;
  const spatial=Array.from({length:601},(_,i)=>{const x=12*i/600;return[x,waveY(wave,x,t)];});
  const temporal=Array.from({length:301},(_,i)=>{const time=p.period*i/300;return[time,waveY(wave,3,time)];});
  Lab.plot($('space'),{xmax:12,ymin:-2,ymax:2,xlabel:'Posición x (m)',ylabel:'Desplazamiento y (m)',curves:[{points:spatial}],vertical:3,markers:[{x:3,y}]});
  Lab.plot($('time'),{xmax:p.period,ymin:-2,ymax:2,xlabel:'Tiempo dentro de un periodo (s)',ylabel:'Desplazamiento y (m) · x = 3 m',curves:[{points:temporal}],vertical:phase,markers:[{x:phase,y}]});
  $('lambda').textContent=format(p.lambda)+' m';$('period').textContent=format(p.period)+' s';$('displacement').textContent=format(y)+' m';$('clock').textContent=format(t)+' s';
  $('outA').textContent=format(wave.A)+' m';$('outF').textContent=format(wave.f)+' Hz';$('outV').textContent=format(wave.v)+' m/s';
  const playText=running?'Ⅱ Pausar':'▶ Animar',status=running?'Animación en marcha':'Animación en pausa';
  if($('play').textContent!==playText)$('play').textContent=playText;$('play').setAttribute('aria-pressed',running);$('step').disabled=running;
  if($('motionState').textContent!==status)$('motionState').textContent=status;
  $('equation').textContent=`Onda actual: y(x,t) = ${format(p.A)} sen(${format(p.k)} x − ${format(p.omega)} t), con x e y en m y t en s. Rapidez de propagación: ${format(p.v)} m/s.`;
}
for(const key of ['A','f','v'])$(key).addEventListener('input',e=>{wave[key]=Number(e.target.value);t=0;last=0;draw();});
$('play').addEventListener('click',()=>{running=!running;last=0;draw();});$('step').addEventListener('click',()=>{if(!running){t+=waveProperties(wave).period/8;draw();}});
$('reset').addEventListener('click',()=>{wave={A:1,f:.5,v:2};t=0;last=0;for(const k of ['A','f','v'])$(k).value=wave[k];$('prediction').value='';$('feedback').textContent='';draw();});
$('csv').addEventListener('click',()=>{Lab.csv('perfil-onda.csv',[['x_m','y_m','t_s','A_m','f_Hz','v_m_s'],...Array.from({length:121},(_,i)=>[i/10,waveY(wave,i/10,t),t,wave.A,wave.f,wave.v])]);});
$('check').addEventListener('click',()=>{const val=$('prediction').value;$('feedback').textContent=val?(val==='half'?'Tu predicción coincide con el modelo. ':'Compruébalo de nuevo con los controles. ')+'Como λ = v/f, duplicar f con v constante reduce λ a la mitad. El periodo también se reduce a la mitad.':'Elige una predicción antes de comprobarla.';});
document.addEventListener('visibilitychange',()=>last=0);
function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(running&&!document.hidden){t+=dt;draw();}requestAnimationFrame(frame);}draw();requestAnimationFrame(frame);

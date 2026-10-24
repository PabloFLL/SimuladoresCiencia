'use strict';
(()=>{
 const {$}=Lab,id=document.body.dataset.experiment,lesson=BachLessons.find(l=>l.id===id);
 if(!lesson)return;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const format=(n,d=2)=>n===null||n===undefined?'—':typeof n==='string'?n:!Number.isFinite(n)?'—':Math.abs(n)>=1e7||Math.abs(n)>0&&Math.abs(n)<.0001?n.toExponential(2).replace('.',','):Lab.format(Math.abs(n)<1e-10?0:n,d);
 let p=Object.fromEntries(lesson.fields.map(f=>[f.key,f.value])),t=0,running=false,last=0,rows=[];
 const integerKeys=new Set(['Z','countC','countA','c0','c1','c2','c3']);
 const result=()=>Bach.evaluate(lesson.model,p,t);
 function duration(){const s=Bach.evaluate(lesson.model,p,0);return lesson.model==='linear'?10:lesson.model==='projectile'?s.flight:lesson.model==='circular'?s.period*2:['friction','incline'].includes(lesson.model)?3:lesson.model==='collision'?s.tc+3:lesson.model==='energy'?s.duration:lesson.model==='spring'?s.period*3:lesson.progress?1:10;}
 $('eyebrow').textContent='1.º Bachillerato · '+(lesson.type==='fisica'?'Física':'Química');$('footerSubject').textContent=(lesson.type==='fisica'?'Física':'Química')+' · '+lesson.badge;$('formula').textContent=lesson.formula;$('question').textContent=lesson.question;$('prediction').innerHTML='<option value="">Elige una respuesta…</option>'+lesson.answers.map((a,i)=>`<option value="${i}">${esc(a)}</option>`).join('');$('prompts').innerHTML=lesson.prompts.map(a=>'<li>'+esc(a)+'</li>').join('');$('limits').textContent=lesson.limits;$('explanation').textContent=lesson.explanation;
 $('scene').setAttribute('aria-label',lesson.title+'. Representación esquemática. Los valores actuales se muestran en los resultados.');
 $('metrics').innerHTML=lesson.metrics.map((m,i)=>`<div class="metric"><span class="label">${esc(m.label)}</span><strong id="metric${i}"></strong><small>${esc(m.unit)}</small></div>`).join('');
 function controls(){
  $('parameters').innerHTML=lesson.fields.map(f=>{
   const key=f.key,input='param-'+key;
   if(f.options)return `<label class="range-control" for="${input}"><span>${esc(f.label)}</span><select id="${input}">${f.options.map(([v,label])=>`<option value="${esc(v)}"${String(v)===String(p[key])?' selected':''}>${esc(label)}</option>`).join('')}</select><small>${esc(f.help||'')}</small></label>`;
   return `<div class="range-control"><div class="range-label"><label id="label-${key}" for="${input}">${esc(f.label)}</label><span class="exact-value"><input type="number" id="number-${key}" aria-label="${esc(f.label)} · valor exacto" min="${f.min}" max="${f.max}" step="any" value="${p[key]}"><span>${esc(f.unit)}</span></span></div><input type="range" id="${input}" aria-labelledby="label-${key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${p[key]}"><small>${esc(f.help||'')}</small></div>`;
  }).join('');
  for(const f of lesson.fields){
   const input=$('param-'+f.key);
   input.addEventListener(f.options?'change':'input',e=>change(f,typeof f.value==='number'?Number(e.target.value):e.target.value));
   const number=$('number-'+f.key);
   if(number){number.addEventListener('input',e=>{if(e.target.value.trim()!==''){const v=Number(e.target.value);if(Number.isFinite(v)&&v>=f.min&&v<=f.max&&(!integerKeys.has(f.key)||Number.isInteger(v)))change(f,v);}});number.addEventListener('change',e=>{if(e.target.value.trim()===''||!Number.isFinite(Number(e.target.value))||Number(e.target.value)<f.min||Number(e.target.value)>f.max||integerKeys.has(f.key)&&!Number.isInteger(Number(e.target.value))){e.target.value=p[f.key];Lab.notice('Usa '+f.label+' dentro del intervalo indicado'+(integerKeys.has(f.key)?' y como número entero.':'.'));}});}
  }
  if(lesson.model==='balance'){const rx=Bach.reactions[p.reaction];for(let i=0;i<4;i++){const key='c'+i,exists=i<rx.names.length;$('label-'+key).textContent=exists?'Coeficiente de '+rx.names[i]:'Sin cuarta especie';$('param-'+key).disabled=!exists;$('number-'+key).disabled=!exists;}}
 }
 function change(field,value){const previous=p[field.key];p[field.key]=value;try{Bach.evaluate(lesson.model,p,0);}catch(error){p[field.key]=previous;$('param-'+field.key).value=previous;if($('number-'+field.key))$('number-'+field.key).value=previous;Lab.notice(error.message);return;}
  if(!['graph','focus','field','direction'].includes(field.key)){t=0;running=false;last=0;}
  if(field.key==='reaction')controls();refresh();
 }
 $('presets').innerHTML=(lesson.presets||[]).map((a,i)=>`<button data-preset="${i}">${esc(a.name)}</button>`).join('');
 $('presets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(!b)return;const preset=lesson.presets[Number(b.dataset.preset)];if(preset.action==='neutralize'){const s=result();p.countC=s.nC;p.countA=s.nA;}else if(preset.action==='balance'){Bach.reactions[p.reaction].coeff.forEach((v,i)=>p['c'+i]=v);}else Object.assign(p,preset.values);t=0;running=false;controls();refresh();});
 if(lesson.animation){$('timeline').hidden=false;if(lesson.progress){$('timeLabel').textContent='Avance del intercambio (sin escala temporal)';$('timeHelp').textContent='Progreso didáctico; no predice la duración real del intercambio.';}}
 function refresh(){
  $('insight').setAttribute('aria-live',running?'off':'polite');
  const s=result(),end=duration();if(t>end)t=end;
  lesson.metrics.forEach((m,i)=>{const el=$('metric'+i),value=s[m.key],text=format(value,m.digits);if(el.textContent!==text)el.textContent=text;el.classList.toggle('text-value',typeof value==='string');});
  for(const f of lesson.fields){const input=$('param-'+f.key),number=$('number-'+f.key);if(document.activeElement!==input)input.value=p[f.key];if(number&&document.activeElement!==number)number.value=p[f.key];}
  $('elapsed').max=end;$('elapsed').value=t;$('timeValue').textContent=lesson.progress?Lab.format(t*100,1)+' %':Lab.format(t)+' s';$('play').textContent=running?'Ⅱ Pausar':'▶ Iniciar';$('play').setAttribute('aria-pressed',running);$('step').disabled=running;
  BachVisuals.draw(lesson,p,s,t,$('scene'),$('plot'),Lab);
 }
 $('elapsed').addEventListener('input',e=>{t=Number(e.target.value);running=false;refresh();});$('play').addEventListener('click',()=>{if(t>=duration())t=0;running=!running;last=0;refresh();});$('step').addEventListener('click',()=>{t=Math.min(duration(),t+duration()/12);refresh();});$('rewind').addEventListener('click',()=>{t=0;running=false;refresh();});
 $('check').addEventListener('click',()=>{const v=$('prediction').value;$('feedback').textContent=v===''?'Elige una predicción antes de comprobarla.':(Number(v)===lesson.correct?'Tu predicción coincide con el modelo. ':'Revisa tu predicción con los controles. ')+lesson.explanation;});
 function renderRows(){$('sampleCount').textContent=rows.length+' de 12';$('statesHead').innerHTML='<tr><th>Estado</th>'+(lesson.animation?'<th>'+(lesson.progress?'Avance (%)':'t (s)')+'</th>':'')+lesson.metrics.map(m=>'<th>'+esc(m.label)+(m.unit?' ('+esc(m.unit)+')':'')+'</th>').join('')+'</tr>';$('statesBody').innerHTML=rows.map((r,i)=>'<tr><td>'+(i+1)+'</td>'+(lesson.animation?'<td>'+format(lesson.progress?r.t*100:r.t)+'</td>':'')+lesson.metrics.map(m=>'<td>'+esc(format(r.s[m.key],m.digits))+'</td>').join('')+'</tr>').join('');}
 $('record').addEventListener('click',()=>{if(rows.length>=12){Lab.notice('Límite de 12 estados. Descarga el CSV antes de borrar los registros.');return;}rows.push({p:{...p},s:{...result()},t});renderRows();});$('clear').addEventListener('click',()=>{rows=[];renderRows();});$('reset').addEventListener('click',()=>{p=Object.fromEntries(lesson.fields.map(f=>[f.key,f.value]));t=0;running=false;controls();$('prediction').value='';$('feedback').textContent='';refresh();});
 $('csv').addEventListener('click',()=>Lab.csv(id+'-estados.csv',[['Estado',lesson.progress?'fraccion_intercambio':'t_s',...lesson.fields.map(f=>f.key+(f.unit?'_'+f.unit:'')),...lesson.metrics.map(m=>m.key+(m.unit?'_'+m.unit:''))],...rows.map((r,i)=>[i+1,r.t,...lesson.fields.map(f=>r.p[f.key]),...lesson.metrics.map(m=>r.s[m.key])])]));
 document.addEventListener('visibilitychange',()=>last=0);
 function frame(now){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;if(running&&!document.hidden){t=Math.min(duration(),t+dt*(lesson.progress ? .15 : 1));if(t>=duration())running=false;refresh();}requestAnimationFrame(frame);}
 controls();renderRows();refresh();requestAnimationFrame(frame);
})();

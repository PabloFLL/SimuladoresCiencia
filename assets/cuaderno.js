'use strict';
const $=id=>document.getElementById(id);
const tasks={
  '2eso':['Una jeringa cerrada','Predice qué ocurrirá con la presión al reducir el volumen a la mitad sin cambiar la temperatura. Compruébalo y explícalo con el movimiento de las partículas.','boyle-mariotte'],
  '3eso':['¿El doble de grados es el doble de temperatura?','Registra estados a 300, 450 y 600 K en Charles. Compara V/T y convierte T a °C. Explica por qué las proporciones se plantean en kelvin.','charles'],
  '4eso':['Una curva que se convierte en recta','Registra cuatro volúmenes en Boyle. Compara las gráficas P–V y P–1/V. Obtén una relación que permita predecir un quinto estado.','boyle-mariotte'],
  '1bach':['Una ecuación, cuatro incógnitas','Con 0,25 mol, 6 L y 300 K calcula P. Cambia después a incógnita V y comprueba el estado. Diseña una prueba en la que se duplique n manteniendo P y T.','gases-ideales'],
  '2bach':['El equilibrio sigue en movimiento','En A ⇌ B espera al equilibrio, añade A y compara Q con K. Después aumenta T: la reacción directa es endotérmica. Distingue el cambio de Q del cambio de K. Alternativa de Física: usa ondas para explicar el perfil espacial y la oscilación local.','equilibrio']
};
const fromURL=new URLSearchParams(location.search).get('curso');if(tasks[fromURL])$('course').value=fromURL;
const experiments=typeof BachLessons==='undefined'?[]:BachLessons;
if($('experiment')){
 $('experiment').innerHTML='<option value="general">Guía general de gases</option><option value="piston-equilibrio">El émbolo decide</option>'+experiments.map(l=>'<option value="'+l.id+'">'+l.title+'</option>').join('');
 const requested=new URLSearchParams(location.search).get('sim');if(requested==='piston-equilibrio'||experiments.some(l=>l.id===requested))$('experiment').value=requested;
 $('experiment').addEventListener('change',load);
}
function worksheetKey(){const c=$('course').value,sim=c==='1bach'&&$('experiment')?$('experiment').value:'general';return 'fq.worksheet.'+c+(sim==='general'?'':'.'+sim);}
function load(){const c=$('course').value;let t=tasks[c];if($('experiment')){$('experimentChoice').hidden=c!=='1bach';if(c==='1bach'){const selected=$('experiment').value,l=experiments.find(x=>x.id===selected);if(l)t=[l.title,l.prompts.join(' '),l.id];else if(selected==='piston-equilibrio')t=['El émbolo decide','Propón 3 L, libera el émbolo y compara la presión del gas con la carga. Después duplica T. Explica cuándo un volumen se puede imponer y cuándo puede mantenerse libre.','piston-equilibrio'];}}$('taskTitle').textContent=t[0];$('taskText').textContent=t[1];$('taskLink').href=t[2]+'.html?curso='+c;let data={};try{data=JSON.parse(localStorage.getItem(worksheetKey())||'{}')||{};}catch{}document.querySelectorAll('[data-answer]').forEach(el=>el.value=typeof data[el.dataset.answer]==='string'?data[el.dataset.answer]:'');$('saveStatus').textContent='Respuestas independientes por curso y experimento.';}
document.querySelectorAll('[data-answer]').forEach(el=>el.addEventListener('input',()=>{const data={};document.querySelectorAll('[data-answer]').forEach(a=>data[a.dataset.answer]=a.value);try{localStorage.setItem(worksheetKey(),JSON.stringify(data));$('saveStatus').textContent='Respuestas guardadas en este navegador.';}catch{$('saveStatus').textContent='No se pudo guardar. Descarga tus respuestas.';}}));
$('course').addEventListener('change',load);$('print').addEventListener('click',()=>window.print());
$('export').addEventListener('click',()=>{const text=['CUADERNO DE INVESTIGACIÓN · '+$('course').selectedOptions[0].textContent,$('taskTitle').textContent,$('taskText').textContent,...Array.from(document.querySelectorAll('[data-answer]'),el=>el.parentElement.firstChild.textContent+'\n'+el.value)].join('\n\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='cuaderno-'+$('course').value+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});load();

/* Approximate classroom reference values. Internal units: g, cm³, kPa, °C. */
(function(root){
'use strict';
const rows=[
 ['air','Aire seco','gas',.0012,'20 °C · 101,3 kPa','#9be0d4','Mezcla de gases; valor redondeado.'],
 ['oxygen','Oxígeno','gas',.00133,'20 °C · 101,3 kPa','#e9ba84','O₂; moléculas distintas de las del aire.'],
 ['water','Agua','líquido',.9982,'20 °C · 101,3 kPa','#65c8e5','Agua pura; ≈ 1 g/cm³.'],
 ['ethanol','Etanol','líquido',.789,'20 °C · 101,3 kPa','#d5b4e8','Etanol puro, no una disolución de alcohol.'],
 ['oil','Aceite de oliva','líquido',.92,'≈ 20 °C · 101,3 kPa','#e4ce73','Valor representativo; depende de su composición.'],
 ['ice','Hielo','sólido',.917,'0 °C · 101,3 kPa','#b1e7f4','Hielo sin poros; red abierta de moléculas de agua.'],
 ['wood','Madera','sólido',.6,'≈ 20 °C · seca','#c7a27d','Muestra de madera: densidad media con poros. Varía por especie y humedad.'],
 ['aluminium','Aluminio','sólido',2.70,'≈ 20 °C · 101,3 kPa','#b4c9d4','Material homogéneo.'],
 ['iron','Hierro','sólido',7.87,'≈ 20 °C · 101,3 kPa','#8fa9b2','Material homogéneo.'],
 ['copper','Cobre','sólido',8.96,'≈ 20 °C · 101,3 kPa','#db997b','Material homogéneo.'],
 ['cork','Corcho','sólido',.24,'≈ 20 °C · seco','#caaa7c','Densidad media de una muestra porosa; no se empapa en este ensayo.'],
 ['plastic','Plástico · PEAD','sólido',.95,'≈ 20 °C · 101,3 kPa','#c4b2e2','Polietileno de alta densidad representativo. Otros plásticos pueden hundirse.']
];
const materials=Object.fromEntries(rows.map(([id,name,state,rho,conditions,color,note])=>[id,Object.freeze({id,name,state,rho,conditions,color,note})]));
const sources=[
 {name:'OpenStax · Densidad y materiales',url:'https://openstax.org/books/college-physics-2e/pages/11-2-density'},
 {name:'OpenStax · Medida de masa y volumen',url:'https://openstax.org/books/chemistry-atoms-first-2e/pages/1-4-measurements'},
 {name:'OpenStax · Empuje y flotación',url:'https://openstax.org/books/university-physics-volume-1/pages/14-4-archimedes-principle-and-buoyancy'},
 {name:'NIST · Propiedades del agua y del vapor',url:'https://webbook.nist.gov/cgi/fluid.cgi?ID=C7732185&Action=Page'},
 {name:'Particle Data Group · Propiedades de materiales',url:'https://pdg.lbl.gov/AtomicNuclearProperties/'}
];
const api={materials:Object.freeze(materials),sources};root.DensityData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

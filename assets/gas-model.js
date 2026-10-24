'use strict';
// Magnitudes internas: atm, L, K y mol. R deriva del valor SI y de 1 atm = 101325 Pa.
const GAS_R = 8.31446261815324 / 101.325;
const GAS_DEFAULT = Object.freeze({V:6,T:300,n:0.25,P:0.25*GAS_R*300/6});
function gasSolve(law,input={},dependent='P') {
  const s={...GAS_DEFAULT,...input};
  const positive=v=>Number.isFinite(v)&&v>0;
  if(law==='boyle') { s.T=GAS_DEFAULT.T;s.n=GAS_DEFAULT.n;if(!positive(s.V))throw Error('El volumen debe ser positivo.');s.P=s.n*GAS_R*s.T/s.V; }
  else if(law==='charles') {s.P=GAS_DEFAULT.P;s.n=GAS_DEFAULT.n;if(!positive(s.T))throw Error('La temperatura absoluta debe ser positiva.');s.V=s.n*GAS_R*s.T/s.P;}
  else if(law==='gay') {s.V=GAS_DEFAULT.V;s.n=GAS_DEFAULT.n;if(!positive(s.T))throw Error('La temperatura absoluta debe ser positiva.');s.P=s.n*GAS_R*s.T/s.V;}
  else if(law==='ideal') {
    if(!['P','V','T','n'].includes(dependent))throw Error('Magnitud desconocida.');
    for(const k of ['P','V','T','n'])if(k!==dependent&&!positive(s[k]))throw Error('Usa magnitudes positivas y temperatura absoluta.');
    if(dependent==='P')s.P=s.n*GAS_R*s.T/s.V;
    if(dependent==='V')s.V=s.n*GAS_R*s.T/s.P;
    if(dependent==='T')s.T=s.P*s.V/(s.n*GAS_R);
    if(dependent==='n')s.n=s.P*s.V/(GAS_R*s.T);
  } else throw Error('Ley desconocida.');
  for(const k of ['P','V','T','n'])if(!positive(s[k]))throw Error('Estado fuera del modelo.');
  return s;
}
function gasInvariant(law,s){return law==='boyle'?s.P*s.V:law==='charles'?s.V/s.T:law==='gay'?s.P/s.T:s.P*s.V/(s.n*s.T);}
function gasPlotPoint(law,s,inverse=false){return law==='boyle'?[inverse?1/s.V:s.V,s.P]:law==='charles'?[s.T,s.V]:law==='gay'?[s.T,s.P]:[s.n*s.T,s.P*s.V];}
function gasThermalSpeed(T){return Math.sqrt(3*8.31446261815324*T/0.028);}
function celsiusToKelvin(c){return c+273.15;}
function atmToKpa(p){return p*101.325;}
if(typeof module!=='undefined')module.exports={GAS_R,GAS_DEFAULT,gasSolve,gasInvariant,gasPlotPoint,gasThermalSpeed,celsiusToKelvin,atmToKpa};

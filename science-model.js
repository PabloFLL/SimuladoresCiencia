'use strict';
function waveProperties({A,f,v}) {
  if(![A,f,v].every(Number.isFinite)||A<0||f<=0||v<=0)throw Error('Parámetros de onda no válidos.');
  return {A,f,v,lambda:v/f,period:1/f,k:2*Math.PI*f/v,omega:2*Math.PI*f};
}
function waveY(s,x,t){const p=waveProperties(s);return p.A*Math.sin(p.k*x-p.omega*t);}
function waveParticleVelocity(s,x,t){const p=waveProperties(s);return -p.A*p.omega*Math.cos(p.k*x-p.omega*t);}
// Reacción ficticia A ⇌ B: constantes cinéticas de primer orden (s^-1).
// E_a directa = 75 kJ/mol, inversa = 25 kJ/mol; ΔH = +50 kJ/mol.
function equilibriumRates(T,catalyst=1){
  if(!Number.isFinite(T)||T<=0||!Number.isFinite(catalyst)||catalyst<=0)throw Error('Temperatura o factor cinético no válidos.');
  const R=8.31446261815324,delta=1/T-1/298.15;
  const forward=.18*Math.exp(-75000/R*delta)*catalyst;
  const reverse=.18*Math.exp(-25000/R*delta)*catalyst;
  return {forward,reverse,K:forward/reverse};
}
function equilibriumStep(s,dt){
  if(![s.A,s.B,s.T,s.V,dt].every(Number.isFinite)||s.A<0||s.B<0||s.T<=0||s.V<=0||dt<0)throw Error('Estado químico no válido.');
  const rates=equilibriumRates(s.T,s.catalyst||1),total=s.A+s.B;
  const targetB=total*rates.K/(1+rates.K);
  // Solución analítica: conserva A+B y evita negativos incluso a pasos grandes.
  const B=targetB+(s.B-targetB)*Math.exp(-(rates.forward+rates.reverse)*dt);
  return {...s,A:total-B,B};
}
function equilibriumMetrics(s){const r=equilibriumRates(s.T,s.catalyst||1);return {...r,cA:s.A/s.V,cB:s.B/s.V,Q:s.A===0?Infinity:s.B/s.A,rateForward:r.forward*s.A/s.V,rateReverse:r.reverse*s.B/s.V};}
if(typeof module!=='undefined')module.exports={waveProperties,waveY,waveParticleVelocity,equilibriumRates,equilibriumStep,equilibriumMetrics};

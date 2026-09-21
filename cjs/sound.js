(function(){'use strict';
const base=new URL('.',document.currentScript.src),music=new Audio(new URL('sound/bgm.mp3',base)),shots=Array.from({length:12},()=>new Audio(new URL('sound/gun.wav',base)));
music.loop=true;music.volume=.25;music.preload='none';shots.forEach(s=>{s.volume=.45;s.preload='auto';});let enabled=false,index=0;
try{enabled=localStorage.getItem('integer-strike-music')==='true';}catch{}
const buttons=['music-menu','music-game'];function label(){for(const id of buttons){const b=document.getElementById(id);b.textContent=enabled?'音樂：開':'音樂：關';b.setAttribute('aria-pressed',String(enabled));}}
function startMusic(){if(enabled)music.play().catch(()=>{enabled=false;label();});}
for(const id of buttons)document.getElementById(id).onclick=()=>{enabled=!enabled;try{localStorage.setItem('integer-strike-music',String(enabled));}catch{}if(enabled)startMusic();else music.pause();label();};
document.addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();document.getElementById('music-game').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)music.pause();else startMusic();});
window.GameSound={unlock:startMusic,shot(){if(!document.getElementById('sound').checked)return;const a=shots[index++%shots.length];a.currentTime=0;a.play().catch(()=>{});}};label();
})();

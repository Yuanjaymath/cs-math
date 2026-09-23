(function(){'use strict';
const base=new URL('.',document.currentScript.src),music=new Audio(new URL('sound/bgm.mp3?v=0.18.0',base)),shots=Array.from({length:12},()=>new Audio(new URL('sound/gun.wav',base)));
music.id='background-music';music.hidden=true;music.loop=true;music.volume=.6;music.muted=false;music.preload='metadata';music.setAttribute('playsinline','');document.body.append(music);
shots.forEach(s=>{s.volume=.45;s.preload='auto';});let enabled=false,index=0,state='off',attempt=0;
try{enabled=localStorage.getItem('integer-strike-music')==='true';}catch{}
const buttons=['music-menu','music-game'];function label(){for(const id of buttons){const b=document.getElementById(id);b.textContent=!enabled?'音樂：關':state==='playing'?'音樂：播放中':state==='loading'?'音樂：載入中…':state==='error'?'音樂：點此重試':'音樂：點此播放';b.setAttribute('aria-pressed',String(enabled));b.title=state==='error'?'音樂未能播放，請點擊重試':'背景音樂音量 60%';}}
function startMusic(){if(!enabled||document.hidden)return;const token=++attempt;state='loading';label();music.muted=false;music.volume=.6;try{Promise.resolve(music.play()).then(()=>{if(token!==attempt||!enabled)return;state=music.paused?'ready':'playing';label();}).catch(()=>{if(token!==attempt||!enabled)return;state='error';label();});}catch{state='error';label();}}
music.addEventListener('playing',()=>{if(enabled){state='playing';label();}else music.pause();});music.addEventListener('waiting',()=>{if(enabled){state='loading';label();}});music.addEventListener('error',()=>{if(enabled){state='error';label();}});
for(const id of buttons)document.getElementById(id).onclick=()=>{if(enabled&&['error','ready','off'].includes(state))startMusic();else{enabled=!enabled;if(enabled)startMusic();else{++attempt;music.pause();state='off';}label();}try{localStorage.setItem('integer-strike-music',String(enabled));}catch{}};
document.addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();document.getElementById('music-game').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){++attempt;music.pause();state='ready';label();}else startMusic();});
window.GameSound={unlock:startMusic,shot(){if(!document.getElementById('sound').checked)return;const a=shots[index++%shots.length];a.currentTime=0;a.play().catch(()=>{});}};label();
})();

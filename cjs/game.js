/* Integer Strike v0.16.0. Local-only educational FPS, no third-party assets. */
(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('world');let renderer;
try{renderer=new ArenaRenderer.Renderer(canvas);}catch(e){$('notice').textContent=e.message;$('start').disabled=true;return;}
let world=ArenaWorld.create(),boxes=world.boxes,nav=ArenaWorld.navigation(boxes);renderer.setScene(world.vertices);
const player={x:0,y:0,z:13,yaw:0,pitch:-.025,vy:0,ground:true,crouch:false,bob:0};
const weapons=[{name:'M4A1',size:30,rate:.16,reload:1.6},{name:'SCOUT',size:10,rate:.7,reload:1.8},{name:'USP',size:12,rate:.3,reload:1.1}];
let session=null,level=1,sim=0,questionStart=0,safeUntil=0,transitionAt=0,feedbackUntil=0,messageUntil=0,hitUntil=0,damageUntil=0,reloadUntil=0,switchUntil=0,lastShot=-1,flash=0,gun=0,ammo=[30,10,12],silenced=[true,false,true],zoom=false,touchCrouch=false,thinking=false,audio=null,previousKey='',pace='gentle';
let bankName='integer';const bank=()=>bankName==='science'?ScienceMath:IntegerMath;const storageKey=()=>bankName==='science'?'integer-strike-science-v1':'integer-strike-v2';
let enemies=[],bullets=[],sparks=[],reportShown=false,currentReportIndex=null,reviewRound=false,focusedPractice=false,reviewLevels=[],storageError=false,saved={unlocked:1,reports:[]};
try{saved=IntegerProgress.decode(localStorage.getItem(storageKey()));}catch{storageError=true;}
const weaponView=new WeaponView($('weapon'));
function save(){saved=IntegerProgress.sanitize(saved);try{localStorage.setItem(storageKey(),JSON.stringify(saved));storageError=false;}catch{storageError=true;}}
function setMessage(text,seconds=2.2){$('message').textContent=text;messageUntil=sim+seconds;}
function updateLevelSelect(){const select=$('level-select');select.replaceChildren();for(let n=1;n<=saved.unlocked;n++){const stars=saved.bestStars?.[n]||0,option=document.createElement('option');option.value=n;option.textContent=`第 ${n} 關 · ${bank().curriculum(n).title}`+(stars?' · '+'★'.repeat(stars)+'☆'.repeat(3-stars):'');select.append(option);}select.value=Math.min(level,saved.unlocked);const total=Object.values(saved.bestStars||{}).reduce((sum,n)=>sum+n,0);$('saved-progress').textContent=storageError?'目前紀錄未能儲存；仍可遊玩，請下載 CSV 保留本次進度。':`已解鎖 ${saved.unlocked} 關 · 累積 ${total} 星 · ${saved.reports.length} 次紀錄（僅存此裝置）`;}
function hud(){if(!session)return;$('health').textContent=session.hp;$('shield').textContent=session.shield;$('health-fill').style.width=session.hp+'%';$('health-fill').style.background=session.hp<35?'#ff9a7b':'#d4ec94';$('combo').textContent=`連對 ${session.streak}`;$('progress-fill').style.width=(session.done/session.goal*100)+'%';$('question-number').textContent=`第 ${Math.min(session.done+1,session.goal)} / ${session.goal} 題`;$('level-badge').textContent='LEVEL '+String(level).padStart(2,'0');$('ammo').textContent=ammo[gun];$('mode').textContent=weapons[gun].name+' · '+(gun===1?(zoom?'瞄準鏡':'精準步槍'):(silenced[gun]?'已裝消音器':'未裝消音器'));$('reload-info').textContent=reloadUntil?'正在更換彈匣…':'R 換彈 · 1 / 2 / 3 切換武器';$('touch-weapon').textContent=weapons[gun].name;$('touch-reload').textContent=reloadUntil?'換彈中\n…':'換彈\n'+ammo[gun]+'/'+weapons[gun].size;$('touch-reload').ariaLabel=reloadUntil?'正在更換彈匣':'換彈，目前 '+ammo[gun]+' 發，彈匣容量 '+weapons[gun].size+' 發';$('touch-reload').classList.toggle('low-ammo',!reloadUntil&&ammo[gun]<=weapons[gun].size*.25);$('touch-crouch').classList.toggle('pressed',touchCrouch);}
function playTone(type){if(!$('sound').checked||!audio)return;try{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type==='shot'?'triangle':'sine';const hz=type==='correct'?660:type==='wrong'?145:type==='enemy'?220:type==='reload'?320:silenced[gun]?170:95;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(type==='correct'?990:Math.max(40,hz*.6),t+.1);g.gain.setValueAtTime(type==='shot'?.025:.06,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(audio.destination);o.start();o.stop(t+.17);}catch{}}
function initAudio(){window.GameSound?.unlock();try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
function feedback(title,detail,wrong=false,duration=2.4){$('feedback-title').textContent=title;$('feedback-detail').textContent=detail;$('feedback').classList.toggle('wrong',wrong);feedbackUntil=sim+duration;}
function weaponChange(index){gun=(index+3)%3;reloadUntil=0;zoom=false;switchUntil=sim+.2;document.body.classList.remove('zoom');document.querySelectorAll('.gun-choice').forEach(b=>b.classList.toggle('selected',Number(b.dataset.gun)===gun));hud();}
function action(name){if(!session||session.state!=='playing')return;
 if(name==='jump'&&player.ground){player.vy=6;player.ground=false;}
 if(name==='reload'&&!reloadUntil&&ammo[gun]<weapons[gun].size){reloadUntil=sim+weapons[gun].reload;hud();playTone('reload');}
 if(name==='crouch')touchCrouch=!touchCrouch;
 if(name==='weapon')weaponChange(gun+1);
 if(/^weapon[123]$/.test(name))weaponChange(Number(name.slice(-1))-1);
 if(name==='secondary'&&sim>switchUntil&&!reloadUntil){if(gun===1){zoom=!zoom;document.body.classList.toggle('zoom',zoom);}else{silenced[gun]=!silenced[gun];switchUntil=sim+.4;}hud();}
}
const controls=new ArenaControls({canvas,onLook:(dx,dy)=>{const s=.0022*Number($('sensitivity').value)*(zoom?.5:1);player.yaw+=dx*s;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch-dy*s));},onAction:action,onActive:active=>{if(active){thinking=false;document.body.classList.remove('thinking','paused');}},onPause:()=>{if(session?.state==='complete'&&!reportShown){showReport();return;}{thinking=false;document.body.classList.remove('thinking');document.body.classList.add('paused');$('start').textContent=session?.state==='playing'?'繼續這場挑戰 →':`開始第 ${level} 關 →`;$('restart').classList.toggle('hidden',!session||session.state!=='playing');}}});
document.body.classList.toggle('touch',controls.touch);
function eye(){return {x:player.x,y:player.y+(player.crouch?.94:1.58),z:player.z};}
function resetPlayer(){Object.assign(player,{x:0,y:0,z:13,yaw:0,pitch:-.025,vy:0,ground:true,crouch:false,bob:0});touchCrouch=false;zoom=false;document.body.classList.remove('zoom');}
function applyTerrain(){const id=$('terrain-select').value;if(world.id===id)return;world=ArenaWorld.create(id);boxes=world.boxes;nav=ArenaWorld.navigation(boxes);renderer.setScene(world.vertices);}
for(const terrain of ArenaWorld.maps){const option=document.createElement('option');option.value=terrain.id;option.textContent=terrain.name;$('terrain-select').append(option);}
$('terrain-select').value='classic';
function terrainDescription(){const terrain=ArenaWorld.maps.find(m=>m.id===$('terrain-select').value)||ArenaWorld.maps[0];$('terrain-description').textContent=terrain.description;}
$('terrain-select').onchange=()=>{terrainDescription();if(!session){applyTerrain();resetPlayer();}};terrainDescription();
function spawnEnemies(question){$('answer-labels').replaceChildren();const labels=['A','B','C','D'],spawns=ArenaWorld.spawnPoints(player,boxes),roles=[...Core.enemyRoles];for(let i=roles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[roles[i],roles[j]]=[roles[j],roles[i]];}enemies=question.options.map((answer,i)=>{
 const connector=document.createElement('div');connector.className='answer-connector';$('answer-labels').append(connector);const label=document.createElement('div');label.className='answer-label';label.dataset.enemy=i;const value=document.createElement('strong');value.textContent=answer<0?'−'+Math.abs(answer):String(answer);const name=document.createElement('small');name.textContent=labels[i]+' / 訓練機器人';label.append(value,name);$('answer-labels').append(label);
 const {x,z}=spawns[i],role=roles[i];name.textContent=labels[i]+' / '+role.name;
 return {id:i,role,answer,x,y:0,z,homeX:x,homeZ:z,w:.9,h:2,d:.7,alive:true,label,connector,plateNode:value,phase:Math.random()*Math.PI*2,nextAttack:sim+.12+i*.12,shotsFired:0,yaw:0,warningUntil:0,target:null,wrong:false};
 });}
function newQuestion(){document.body.classList.toggle('science',bankName==='science');const practiceLevel=reviewRound?(reviewLevels[session.done]||level):level;const q=bank().generate(practiceLevel,Math.random,previousKey);previousKey=q.key;session.begin(q);questionStart=sim;safeUntil=sim;thinking=false;document.body.classList.remove('thinking');bullets=[];controls.fire=false;transitionAt=0;$('expression').textContent=bankName==='science'?q.expression:q.expression+' = ?';$('skill').textContent=(focusedPractice?'專項 · ':reviewRound?(session.done===0?'① 基本觀念 · ':'② 回關挑戰 · '):'')+q.skill;spawnEnemies(q);hud();}
// Keep one slot per run: each solved question replaces its previous checkpoint.
function checkpointRun(){const report=session.report();report.date=new Date().toISOString();report.review=reviewRound;if(focusedPractice)report.practice=true;
 if(currentReportIndex===null)saved.reports.push(report);else saved.reports[currentReportIndex]=report;
 if(report.complete&&!reviewRound)saved.unlocked=Math.min(100,Math.max(saved.unlocked,level+1));
 save();currentReportIndex=saved.reports.length-1;updateLevelSelect();return report;
}
function archivePartialRun(){if(!session||reportShown||session.state!=='playing'||session.done===0)return;checkpointRun();reportShown=true;}
function startLevel(n,review=false,focus=false){archivePartialRun();focusedPractice=focus;reviewLevels=focus?[n,n,n]:review?(bankName==='science'?[n,n]:IntegerCoach.reviewPlan(n,session?.records||[],session&&!session.solved?session.question:null)):[];applyTerrain();level=Math.max(1,Math.min(focus?(bankName==='science'?15:11):saved.unlocked,n));reviewRound=review||focus;const config=bank().curriculum(level);session=new IntegerSession.Session(level,focus?3:review?2:config.goal);sim=0;transitionAt=0;reloadUntil=0;feedbackUntil=0;switchUntil=0;hitUntil=0;damageUntil=0;messageUntil=0;flash=0;lastShot=-1;reportShown=false;currentReportIndex=null;ammo=weapons.map(w=>w.size);bullets=[];sparks=[];thinking=false;pace=$('pace').value;resetPlayer();newQuestion();$('results').classList.add('hidden');$('records-panel').classList.add('hidden');$('level-select').value=Math.min(level,saved.unlocked);$('restart').classList.remove('hidden');}
async function start(){initAudio();if(session?.state==='complete'){showReport();return;}if(!session||session.state!=='playing')startLevel(Number($('level-select').value));try{await controls.start();}catch(e){if(e.message!=='Start cancelled.')$('notice').textContent='滑鼠鎖定未成功，請再點一次開始；也可選擇「平板雙搖桿」。';}}
$('start').onclick=start;$('restart').onclick=()=>{startLevel(level,focusedPractice,focusedPractice);start();};
$('start-practice').onclick=()=>{startLevel(Number($('practice-select').value),true,true);start();};
$('level-select').onchange=()=>{const next=Number($('level-select').value);archivePartialRun();level=next;focusedPractice=false;$('level-select').value=level;session=null;$('start').textContent=`開始第 ${level} 關 →`;$('restart').classList.add('hidden');};
$('input-mode').onchange=()=>{const mode=$('input-mode').value;controls.setTouch(mode==='touch'||mode==='auto'&&(matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0));document.body.classList.toggle('touch',controls.touch);};
$('quality').onchange=()=>{renderer.quality=Number($('quality').value);renderer.resize();};addEventListener('resize',()=>{renderer.resize();controls.clear();});
document.querySelectorAll('.gun-choice').forEach(b=>b.onclick=()=>weaponChange(Number(b.dataset.gun)));
function drawNumberLine(q){const cv=$('number-line'),data=IntegerCoach.numberLine(q);cv.style.display=data?'block':'none';if(!data)return;const ctx=cv.getContext('2d');ctx.clearRect(0,0,800,160);const end=data.start+data.delta,min=Math.min(-5,data.start-2,end-2),max=Math.max(5,data.start+2,end+2),x=n=>36+(n-min)/(max-min)*728;ctx.strokeStyle='#94b3ad';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(30,98);ctx.lineTo(770,98);ctx.stroke();ctx.font='20px sans-serif';ctx.textAlign='center';for(let n=min;n<=max;n++){const px=x(n);ctx.beginPath();ctx.moveTo(px,92);ctx.lineTo(px,104);ctx.stroke();if(max-min<=24||n%2===0){ctx.fillStyle=n===0?'#e8f4e0':'#9ab8b0';ctx.fillText(String(n),px,132);}}ctx.fillStyle='#d4ec94';ctx.beginPath();ctx.arc(x(data.start),98,7,0,Math.PI*2);ctx.fill();ctx.fillText('起點 '+data.start,x(data.start),32);ctx.strokeStyle='#d4ec94';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x(data.start),65);ctx.lineTo(x(end),65);ctx.stroke();const sign=Math.sign(data.delta)||1;ctx.beginPath();ctx.moveTo(x(end)-sign*10,59);ctx.lineTo(x(end),65);ctx.lineTo(x(end)-sign*10,71);ctx.stroke();}
function think(){if(!session||session.state!=='playing'||!controls.active||transitionAt)return;thinking=!thinking;document.body.classList.toggle('thinking',thinking);if(!thinking)return;session.useHint();$('think-hint').textContent=IntegerCoach.hint(session.question)+(session.question.firstStep?' 第一步：'+session.question.firstStep:'');}
$('think-button').onclick=think;$('touch-think').onclick=think;$('think-resume').onclick=think;addEventListener('keydown',e=>{if(e.code==='KeyT'&&!e.repeat&&controls.active){e.preventDefault();think();}});
function showReport(){if(reportShown)return;reportShown=true;transitionAt=0;controls.pause();thinking=false;document.body.classList.remove('thinking');document.body.classList.add('paused');const report=checkpointRun();$('results').classList.remove('hidden');
 $('result-eyebrow').textContent=report.complete?'MISSION COMPLETE':'KEEP LEARNING';$('medal').textContent=report.complete?(report.accuracy===100?'★★★':report.accuracy>=66?'★★':'★'):'↻';$('result-title').textContent=report.complete?(reviewRound?'觀念修復任務完成！':'第 '+level+' 關，突破成功！'):'先整理觀念，再挑戰一次';$('result-subtitle').textContent=report.complete?(reviewRound?'先練基本觀念，再回到原關卡。把這份經驗帶回闖關。':`下一關：${bank().curriculum(level+1).title}。每一次計算，都讓你更熟練。`):'答錯是學習的線索。看看下面的解題步驟，也可以使用戰鬥提示。';$('result-accuracy').textContent=report.accuracy+'%';$('result-streak').textContent=report.bestStreak;$('result-score').textContent=report.score;$('next-level').textContent=reviewRound?'回到正常挑戰 →':'挑戰下一關 →';$('next-level').classList.toggle('hidden',!report.complete||level>=100);$('review-mistakes').classList.toggle('hidden',!report.records.some(r=>!r.firstTry)&&report.complete);renderReview(report.records,$('review-list'));
 if(focusedPractice){$('medal').textContent=report.complete?'✓':'↻';$('result-title').textContent=report.complete?'專項練習完成！':'整理觀念，再試一次';$('result-subtitle').textContent='這次練習已列入學習紀錄，不改變正式關卡的解鎖與星等。';$('next-level').textContent='同一觀念，再練三題 →';}
 if(report.complete&&level>=100){$('next-level').classList.toggle('hidden',!reviewRound);if(!reviewRound){$('result-title').textContent='第 100 關完成！';$('result-subtitle').textContent='你已完成最後一關。可以回選單挑戰其他地形，或重玩關卡提升最佳星等。';}}
 if(report.complete&&!reviewRound){const best=saved.bestStars?.[level]||1;$('result-subtitle').textContent+=` 本關最佳：${'★'.repeat(best)}${'☆'.repeat(3-best)}。`+(best<3?'重玩並提升首次答對率，可取得更多星星。':'本關已達三星！');}
 if(!report.complete&&session.question&&!session.solved){const row=document.createElement('div');row.className='review-item wrong';const b=document.createElement('b');b.textContent='未完成：'+session.question.expression+' = '+session.question.answer;const span=document.createElement('span');span.textContent=session.question.explanation;row.append(b,span);$('review-list').prepend(row);reviewPage=0;updateReviewPage();}
}
let reviewPage=0;function updateReviewPage(){const items=[...$('review-list').children];reviewPage=Math.max(0,Math.min(items.length-1,reviewPage));items.forEach((el,i)=>el.hidden=i!==reviewPage);$('review-page').textContent=items.length?(reviewPage+1)+' / '+items.length:'沒有已完成的題目';$('review-prev').disabled=reviewPage<=0;$('review-next').disabled=reviewPage>=items.length-1;}
$('review-prev').onclick=()=>{reviewPage--;updateReviewPage();};$('review-next').onclick=()=>{reviewPage++;updateReviewPage();};
function renderReview(records,container){container.replaceChildren();for(const record of records){const row=document.createElement('div');row.className='review-item'+(record.firstTry?'':' wrong');const title=document.createElement('b');title.textContent=(record.firstTry?'✓ ':'↻ ')+record.expression+' = '+record.answer;const detail=document.createElement('span');detail.textContent=record.firstTry?'首次答對 · '+record.seconds+' 秒':`曾選 ${record.wrongAnswers.join('、')}。${record.explanation}`;if(record.hintUsed)detail.textContent+=' · 曾開啟思考提示';row.append(title,detail);container.append(row);}if(container===$('review-list')){reviewPage=0;updateReviewPage();}}
$('next-level').onclick=()=>{startLevel(reviewRound?level:level+1,focusedPractice,focusedPractice);start();};$('review-mistakes').onclick=()=>{startLevel(level,true,focusedPractice);start();};$('retry-level').onclick=()=>{startLevel(level,focusedPractice,focusedPractice);start();};$('back-menu').onclick=()=>{$('results').classList.add('hidden');session=null;focusedPractice=false;level=Math.min(level,saved.unlocked);$('start').textContent=`開始第 ${level} 關 →`;$('restart').classList.add('hidden');};
function showRecords(){saved=IntegerProgress.sanitize(saved);const summary=IntegerProgress.summarize(saved.reports),summaryEl=$('records-summary');summaryEl.replaceChildren();for(const [value,label] of [[summary.solved,'已完成題數'],[summary.accuracy+'%','首次答對'],[summary.runs,'練習次數']]){const div=document.createElement('div'),b=document.createElement('strong'),small=document.createElement('small');b.textContent=value;small.textContent=label;div.append(b,small);summaryEl.append(div);}
 const skills=$('records-skills');skills.replaceChildren();for(const entry of [...summary.skills].sort((a,b)=>a.accuracy-b.accuracy||b.solved-a.solved)){const row=document.createElement('div');row.className='skill-summary';const title=document.createElement('strong');title.textContent=entry.skill;const count=document.createElement('span');count.textContent=`${entry.firstTry} / ${entry.solved} 題首次答對 · ${entry.wrongAttempts} 次錯誤選項`;const track=document.createElement('div'),fill=document.createElement('i');track.className='skill-track';fill.style.width=entry.accuracy+'%';fill.style.background=entry.accuracy<70?'#ffc188':'#cfe992';track.append(fill);const note=document.createElement('small');note.textContent=entry.solved<3?'樣本還少，多練幾題再觀察。':entry.accuracy<70?'可以先用戰鬥提示練穩，再提高速度。':'觀念逐漸熟練，繼續保持。';row.append(title,count,track,note);const topic=bankName==='science'?ScienceMath.titles.indexOf(entry.skill)+1:IntegerCoach.practiceLevel(entry.skill);if(topic){const practice=document.createElement('button');practice.className='skill-practice';practice.dataset.topic=topic;practice.textContent='練這個觀念 · 三題';practice.setAttribute('aria-label',entry.skill+'：開始三題專項練習');practice.onclick=()=>{$('practice-select').value=topic;startLevel(topic,true,true);start();};row.append(practice);}skills.append(row);}
 const list=$('records-list');list.replaceChildren();if(!saved.reports.length){const p=document.createElement('p');p.textContent='完成一次挑戰後，這裡會留下你的學習紀錄。';list.append(p);}for(const r of [...saved.reports].reverse()){const row=document.createElement('div');row.className='review-item';const b=document.createElement('b');b.textContent=`第 ${r.level} 關 · ${r.practice?'專項練習':r.review?'觀念修復':r.complete?'過關':'練習'} · 首答正確率 ${r.accuracy}%`;const s=document.createElement('span');s.textContent=`完成 ${r.done} 題 · 最佳連對 ${r.bestStreak} · ${r.date?new Date(r.date).toLocaleString('zh-TW'):''}`;s.textContent+=r.records.every(x=>typeof x.hintUsed==='boolean')?' · 開啟思考提示 '+r.records.filter(x=>x.hintUsed).length+' 題':' · 提示使用未完整記錄';row.append(b,s);list.append(row);for(const wrong of r.records.filter(x=>!x.firstTry)){const p=document.createElement('span');p.textContent=wrong.expression+' = '+wrong.answer+'｜'+wrong.explanation;row.append(p);}}
 $('export-records').disabled=summary.solved===0;$('records-panel').classList.remove('hidden');
}
$('show-records').onclick=showRecords;$('close-records').onclick=()=>$('records-panel').classList.add('hidden');
$('export-records').onclick=()=>{const url=URL.createObjectURL(new Blob([IntegerProgress.toCSV(saved.reports)],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='整數突擊-'+bankName+'-學習紀錄-'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function hitEnemy(enemy){if(!session||transitionAt)return;const result=session.answer(enemy.answer,sim-questionStart);if(result.type==='ignored'){setMessage('這個答案已經試過，找找其他機器人。');return;}
 if(result.type==='wrong'){enemy.wrong=true;damageUntil=sim+.25;playTone('wrong');const coaching=IntegerCoach.mistake(session.question,session.attempts.size,enemy.answer);feedback(coaching.title,coaching.detail,true,5);if(session.state==='lost')showReport();}
 else{checkpointRun();enemy.alive=false;enemy.label.style.display='none';hitUntil=sim+.35;playTone('correct');feedback(session.streak>0&&session.streak%3===0?'連對獎勵！護盾 +25':'答對了！生命 +8',session.question.expression+' = '+session.question.answer,false,1.4);transitionAt=sim+1.5;bullets=[];for(const e of enemies){e.warningUntil=0;e.muzzleUntil=0;}for(let i=0;i<12;i++)sparks.push({x:enemy.x,y:1,z:enemy.z,vx:(Math.random()-.5)*3,vy:Math.random()*3,vz:(Math.random()-.5)*3,life:.5,color:[.72,.93,.52]});}hud();controls.fire=false;
}
function aimTrace(){const cp=Math.cos(player.pitch),d=[Math.sin(player.yaw)*cp,Math.sin(player.pitch),-Math.cos(player.yaw)*cp],o=eye();let nearest=45,target=null;
 for(const b of boxes)nearest=Math.min(nearest,Core.rayBox([o.x,o.y,o.z],d,b));for(const e of enemies)if(e.alive){let distance=Core.rayBox([o.x,o.y,o.z],d,e);if(e.label.style.display==='block'&&ArenaWorld.visible(o,{x:e.x,y:e.y+1.8,z:e.z},boxes)){const rect=e.plateNode?.getBoundingClientRect?.(),cx=innerWidth/2,cy=innerHeight/2;if(rect&&rect.left<=cx&&rect.right>=cx&&rect.top<=cy&&rect.bottom>=cy)distance=Math.min(distance,Math.hypot(e.x-o.x,e.y+2.5-o.y,e.z-o.z));}if(distance<nearest){nearest=distance;target=e;}}
 return {o,d,nearest,target};
}
function shoot(){if(!session||session.state!=='playing'||transitionAt||reloadUntil||sim<switchUntil||sim-lastShot<weapons[gun].rate)return;lastShot=sim;if(ammo[gun]===0){action('reload');return;}ammo[gun]--;flash=.085;if(window.GameSound)GameSound.shot();else playTone('shot');const {o,d,nearest,target}=aimTrace();
 if(target)hitEnemy(target);else{sparks.push({x:o.x+d[0]*nearest,y:o.y+d[1]*nearest,z:o.z+d[2]*nearest,vx:0,vy:0,vz:0,life:.14,color:[1,.82,.46]});}hud();
}
function fireEnemy(enemy){if(transitionAt||!session||session.state!=='playing')return;enemy.shotsFired=(enemy.shotsFired||0)+1;enemy.muzzleUntil=sim+.08;
 const o={x:enemy.x,y:enemy.y+1.2,z:enemy.z},target=enemy.target;if(!target)return;
 const len=Math.hypot(target.x-o.x,target.y-o.y,target.z-o.z);if(!len)return;
 const speed=pace==='gentle'?6:7.5;
 bullets.push({...o,vx:(target.x-o.x)/len*speed,vy:(target.y-o.y)/len*speed,vz:(target.z-o.z)/len*speed,age:0,life:7});
 playTone('enemy');
}
function projectileStep(dt){if(transitionAt||!session||session.state!=='playing')return;
 const body={x:player.x,y:player.y,z:player.z,w:.8,h:player.crouch?1.1:1.8,d:.8};
 for(let i=bullets.length-1;i>=0;i--){const b=bullets[i],old={x:b.x,y:b.y,z:b.z};b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.age+=dt;b.life-=dt;
  const wall=Core.segmentCollision(old,b,boxes),hit=Core.segmentCollision(old,b,[body]);
  if(hit&&(!wall||hit.distance<wall.distance)){bullets.splice(i,1);session.damage(pace==='gentle'?6:9);damageUntil=sim+.2;hud();setMessage('中彈！留意橘色彈道，橫向移動躲避',1.4);if(session.state==='lost'){bullets=[];showReport();return;}}
  else if(wall||b.life<=0)bullets.splice(i,1);
 }
}
function moveEnemy(e,dt){
 if(!e.route?.length||sim>=e.routeUntil){
  // Alternate pursuit with map-wide patrol; never encode the correct answer in behaviour.
  const chase=sim>4&&Math.random()<.35,angle=e.id*Math.PI/2+sim*.06;
  let target=chase?{x:player.x+Math.cos(angle)*7,y:player.y,z:player.z+Math.sin(angle)*7}:nav.nodes[Math.floor(Math.random()*nav.nodes.length)];
  for(let attempt=0;attempt<16&&enemies.some(other=>other!==e&&other.alive&&Math.hypot((other.destination?.x??other.x)-target.x,(other.destination?.z??other.z)-target.z)<5);attempt++)target=nav.nodes[Math.floor(Math.random()*nav.nodes.length)];
  e.destination=target;
  e.route=nav.path(e,target);e.routeUntil=sim+(chase?2.5:12);e.routeIndex=0;
 }
 let budget=ArenaWorld.enemySpeed(level)*dt;
 while(budget>0&&e.routeIndex<e.route.length){const p=e.route[e.routeIndex],dx=p.x-e.x,dz=p.z-e.z,len=Math.hypot(dx,dz);if(len<.015){e.y=p.y;e.routeIndex++;continue;}
  const step=Math.min(budget,len,.12),x=e.x+dx/len*step,z=e.z+dz/len*step,y=Math.max(e.y,p.y);
  if(enemies.some(other=>other!==e&&other.alive&&Math.abs(other.y-y)<2&&Math.hypot(other.x-x,other.z-z)<2.6)||!ArenaWorld.canMoveActor({...e,y},x,z,boxes,player,enemies.filter(other=>other!==e))){e.routeUntil=Math.min(e.routeUntil,sim+.3);break;}
  e.x=x;e.z=z;e.y=y;budget-=step;if(step>=len-.001){e.y=p.y;e.routeIndex++;}
 }
 if(e.routeIndex>=e.route.length)e.route=[];
}
function enemyStep(dt){if(transitionAt||!session||session.state!=='playing')return;
 for(const e of enemies){if(!e.alive)continue;moveEnemy(e,dt);e.yaw=Math.atan2(player.x-e.x,player.z-e.z);
  if(e.warningUntil){
   // Track the player during warning, then commit the aim for the last 0.18 s.
   if(sim<e.warningUntil-.18)e.target=eye();
   if(sim>=e.warningUntil){fireEnemy(e);e.warningUntil=0;e.burstLeft=(e.burstLeft??(Math.random()<.5?2:3))-1;if(e.burstLeft<=0){e.burstLeft=null;e.nextAttack=sim+(pace==='gentle'?3:2.5);}else e.nextAttack=sim+.45;if(session.state!=='playing')return;}
  }else if(sim>=e.nextAttack&&ArenaWorld.visible({x:e.x,y:e.y+1.2,z:e.z},eye(),boxes)){e.target=eye();e.warningUntil=sim+.45;}
 }
 projectileStep(dt);
}
const dynamic=[];function box(x,y,z,w,h,d,c){ArenaRenderer.cube(dynamic,{x,y,z,w,h,d},c);}
function renderEnemies(){const card=$('question-card').getBoundingClientRect(),vitals=controls.touch&&innerWidth>600&&innerHeight<=450?$('vitals').getBoundingClientRect():null;for(const e of enemies){if(!e.alive)continue;const vertexStart=dynamic.length;const stride=Math.sin(sim*5+e.phase)*.1,metal=e.wrong?[.43,.47,.45]:[.52,.61,.59],armor=e.wrong?[.50,.36,.30]:(e.role||Core.enemyRoles[0]).color,light=e.warningUntil?[1,.30,.15]:[.76,.93,.92];
 box(e.x-.22,e.y,e.z+stride,.26,.72,.32,metal);box(e.x+.22,e.y,e.z-stride,.26,.72,.32,metal);box(e.x,e.y+.72,e.z,.75,.77,.5,armor);box(e.x,e.y+1.53,e.z,.51,.47,.47,metal);box(e.x,e.y+1.72,e.z+.25,.39,.11,.025,light);box(e.x-.52,e.y+.77,e.z,.22,.64,.25,metal);box(e.x+.52,e.y+.84,e.z+.12,.22,.52,.26,metal);box(e.x+.5,e.y+1.05,e.z+.4,.18,.18,.6,[.22,.33,.34]);box(e.x,e.y+1.13,e.z+.26,.30,.20,.035,[.18,.32,.35]);
 if(sim<(e.muzzleUntil||0))box(e.x+.5,e.y+1.08,e.z+.76,.16,.16,.16,[1,.54,.23]);
 const yaw=Math.atan2(player.x-e.x,player.z-e.z),cs=Math.cos(yaw),sn=Math.sin(yaw);for(let j=vertexStart;j<dynamic.length;j+=6){const x=dynamic[j]-e.x,z=dynamic[j+2]-e.z;dynamic[j]=e.x+x*cs+z*sn;dynamic[j+2]=e.z-x*sn+z*cs;}
 const p=renderer.project(e.x,e.y+2.32,e.z);const visible=p&&p.x>-40&&p.x<innerWidth+40&&p.y>70&&p.y<innerHeight-40&&ArenaWorld.visible(eye(),{x:e.x,y:e.y+1.8,z:e.z},boxes);e.label.style.display=visible?'block':'none';if(visible){const belowQuestion=card.height>0&&p.x>card.left-48&&p.x<card.right+48;let labelY=belowQuestion?Math.max(p.y,card.bottom+72):p.y;if(vitals&&p.x>vitals.left-48&&p.x<vitals.right+48&&labelY>vitals.top&&labelY-72<vitals.bottom)labelY=vitals.bottom+72;e.label.style.left=p.x+'px';e.label.style.top=labelY+'px';e.label.classList.toggle('wrong',e.wrong);e.label.classList.toggle('warning',!!e.warningUntil);}
 }}
let labelPositions=[],labelAt=-Infinity;
function layoutAnswers(now){const visible=enemies.filter(e=>e.alive&&e.label.style.display==='block');
 if(now-labelAt>100){const items=visible.map(e=>{const r=e.label.getBoundingClientRect();return {id:e.id,x:parseFloat(e.label.style.left),y:parseFloat(e.label.style.top),w:r.width,h:r.height};});const avoid=['question-card','creator-credit'].map(id=>$(id).getBoundingClientRect()).map(r=>({x:r.left,y:r.top,w:r.width,h:r.height}));labelPositions=ArenaWorld.labelLayout(items,innerWidth,innerHeight,avoid);labelAt=now;}
 for(const e of enemies){if(!e.connector)continue;const r=labelPositions.find(p=>p.id===e.id),head=renderer.project(e.x,e.y+1.9,e.z);if(!r||!head||!visible.includes(e)){e.connector.style.display='none';continue;}e.label.style.left=r.x+r.w/2+'px';e.label.style.top=r.y+r.h+'px';const x=r.x+r.w/2,y=r.y+r.h,dx=head.x-x,dy=head.y-y;e.connector.style.cssText='display:block;left:'+x+'px;top:'+y+'px;width:'+Math.hypot(dx,dy)+'px;transform:rotate('+Math.atan2(dy,dx)+'rad)';}
}
const map=$('map').getContext('2d');function radar(){map.clearRect(0,0,152,152);for(const b of boxes){if(b.y<0)continue;map.fillStyle=b.h>=5?'#a9b49b':b.y>=3?'#758e84':'#3a5c61';map.fillRect(76+(b.x-b.w/2)*3.5,76+(b.z-b.d/2)*3.5,b.w*3.5,b.d*3.5);}map.fillStyle='#ffc587';for(const e of enemies)if(e.alive){map.beginPath();map.arc(76+e.x*3.5,76+e.z*3.5,2.6,0,Math.PI*2);map.fill();}map.save();map.translate(76+player.x*3.5,76+player.z*3.5);map.rotate(player.yaw);map.fillStyle='#e1fbb1';map.beginPath();map.moveTo(0,-5);map.lineTo(-3,4);map.lineTo(3,4);map.fill();map.restore();}
let last=performance.now(),frames=0,fpsStart=last,acc=0,uiTick=0,measuredFPS=60,lastDraw=-Infinity,drawCount=0,wasRenderingActive=false;
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;const active=controls.active&&session;
 if(!Core.renderDue(!!active,document.hidden,now,lastDraw)){requestAnimationFrame(frame);return;}
 lastDraw=now;drawCount++;if(!!active!==wasRenderingActive){frames=0;fpsStart=now;wasRenderingActive=!!active;$('fps').textContent=active?'遊戲中':'暫停省電';}
 if(active){sim+=dt;const a=controls.axes(),sens=Number($('sensitivity').value)*(zoom?.5:1);player.yaw+=a.lookX*1.9*sens*dt;player.pitch=Math.max(-1.45,Math.min(1.45,player.pitch-a.lookY*1.5*sens*dt));acc+=dt;
  while(acc>=1/120){ArenaWorld.step(player,{forward:a.forward,right:a.right,crouch:touchCrouch||controls.keys.has('ControlLeft')||controls.keys.has('ControlRight'),slow:controls.keys.has('ShiftLeft')||controls.keys.has('ShiftRight')},boxes,1/120,enemies);acc-=1/120;}
  if(reloadUntil&&sim>=reloadUntil){ammo[gun]=weapons[gun].size;reloadUntil=0;hud();}if(controls.fire)shoot();enemyStep(dt);flash=Math.max(0,flash-dt);
  for(let i=sparks.length-1;i>=0;i--){const p=sparks[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*3;p.life-=dt;if(p.life<=0)sparks.splice(i,1);}
  if(transitionAt&&sim>=transitionAt){transitionAt=0;if(session.state==='complete')showReport();else newQuestion();}
 }else acc=0;
 renderer.camera(player,player.crouch?.94:1.58,zoom);dynamic.length=0;renderEnemies();layoutAnswers(now);for(const b of bullets){box(b.x,b.y-.09,b.z,.18,.18,.18,[1,.85,.3]);for(let t=1;t<=5;t++){const tail=Math.min(b.age,t*.025),size=.13-t*.015;box(b.x-b.vx*tail,b.y-b.vy*tail-size/2,b.z-b.vz*tail,size,size,size,[1,.6-t*.06,.15]);}}for(const p of sparks)box(p.x,p.y,p.z,.07,.07,.07,p.color);renderer.render(dynamic);weaponView.draw({bob:player.bob,flash,reloading:!!reloadUntil,silenced:silenced[gun],gun,zoom});
 $('feedback').style.opacity=sim<feedbackUntil?'1':'0';$('hit').style.opacity=sim<hitUntil?'1':'0';$('damage-flash').style.opacity=sim<damageUntil?'1':'0';if(sim>messageUntil)$('message').textContent='';
 if(now-uiTick>90){radar();const aimed=active&&!transitionAt&&sim>=feedbackUntil?aimTrace().target:null;$('aim-choice').textContent=aimed?'瞄準：'+(aimed.answer<0?'−'+Math.abs(aimed.answer):aimed.answer):'';if(session){const remaining=Math.max(0,Math.ceil(safeUntil-sim));$('grace').textContent=transitionAt?'解題成功，準備下一題':remaining?`準備 ${remaining} 秒`:'敵人瞄準時會亮燈 · 利用掩體並持續移動';}uiTick=now;}
 frames++;if(!active)$('fps').textContent='暫停省電';else if(now-fpsStart>=1000){measuredFPS=Math.round(frames*1000/(now-fpsStart));$('fps').textContent=measuredFPS+' FPS';frames=0;fpsStart=now;}requestAnimationFrame(frame);
}
function savePreferences(){try{localStorage.setItem('integer-strike-settings-v1',JSON.stringify(IntegerProgress.preferences({terrain:$('terrain-select').value,quality:$('quality').value,pace:$('pace').value,input:$('input-mode').value,sensitivity:Number($('sensitivity').value),sound:$('sound').checked})));}catch{}}
function restorePreferences(){let raw=null;try{raw=JSON.parse(localStorage.getItem('integer-strike-settings-v1'));}catch{}const p=IntegerProgress.preferences(raw);$('terrain-select').value=p.terrain;$('quality').value=p.quality;$('pace').value=p.pace;$('input-mode').value=p.input;$('sensitivity').value=p.sensitivity;$('sound').checked=p.sound;applyTerrain();terrainDescription();$('quality').onchange();$('input-mode').onchange();}
restorePreferences();for(const id of ['terrain-select','quality','pace','input-mode','sensitivity','sound'])$(id).addEventListener('change',savePreferences);
function fullscreenLabel(){$('fullscreen').textContent=document.fullscreenElement?'離開全螢幕':'全螢幕遊玩';}
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else throw Error('unsupported');$('fullscreen-note').textContent='';}catch{$('fullscreen-note').textContent='此瀏覽器目前無法切換全螢幕，仍可直接開始遊戲。';}fullscreenLabel();};document.addEventListener('fullscreenchange',fullscreenLabel);

const integerPractice=[...$('practice-select').children].map(o=>({value:o.value,text:o.textContent}));
$('bank-select').onchange=()=>{archivePartialRun();controls.pause();bankName=$('bank-select').value==='science'?'science':'integer';session=null;level=1;previousKey='';currentReportIndex=null;focusedPractice=false;reviewRound=false;try{saved=IntegerProgress.decode(localStorage.getItem(storageKey()));}catch{saved=IntegerProgress.sanitize(null);}const opts=bankName==='science'?ScienceMath.titles.map((text,i)=>({value:i+1,text})):integerPractice;$('practice-select').replaceChildren();for(const item of opts){const o=document.createElement('option');o.value=item.value;o.textContent=item.text;$('practice-select').append(o);}updateLevelSelect();$('start').textContent='開始第 1 關 →';$('restart').classList.add('hidden');document.body.classList.toggle('science',bankName==='science');};
updateLevelSelect();renderer.camera(player);requestAnimationFrame(frame);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();controls.pause();$('notice').textContent='顯示卡連線中斷，請重新整理遊戲。進度已完成的關卡仍會保留。';$('start').disabled=true;});
// Read-only diagnostics for QA; no state mutation or answer shortcuts.
window.arenaDiagnostics=()=>({version:'0.16.0',bank:bankName,focusedPractice,reviewLevels:[...reviewLevels],drawCount,terrain:world.id,triangles:renderer.triangles,fps:measuredFPS,webgl:renderer.gl.getError(),position:{...player},active:controls.active,touch:controls.touch,input:controls.axes(),fire:controls.fire,thinking,enemySpeed:ArenaWorld.enemySpeed(level),level,reviewRound,gun,ammo:ammo[gun],hp:session?.hp,shield:session?.shield,done:session?.done,goal:session?.goal,state:session?.state,question:session?.question,sim,safeUntil,bullets:bullets.length,enemies:enemies.map(e=>({id:e.id,role:e.role?.id,x:e.x,y:e.y,z:e.z,answer:e.answer,alive:e.alive,warning:!!e.warningUntil,yaw:e.yaw,shotsFired:e.shotsFired,screen:renderer.project(e.x,e.y+1.1,e.z)})),report:session?.report()});
})();





















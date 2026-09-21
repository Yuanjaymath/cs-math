(function(root){'use strict';
class Session{
 constructor(level=1,goal=5){this.level=level;this.goal=goal;this.hp=100;this.shield=0;this.done=0;this.streak=0;this.bestStreak=0;this.correctFirst=0;this.records=[];this.state='playing';this.question=null;this.attempts=new Set();this.solved=false;this.score=0;}
 begin(question){if(this.state!=='playing')return;this.question=question;this.attempts=new Set();this.solved=false;this.hintUsed=false;}
 useHint(){if(this.state==='playing'&&this.question&&!this.solved)this.hintUsed=true;}
 answer(value,seconds){if(this.state!=='playing'||this.solved||!this.question||this.attempts.has(value)||!this.question.options.includes(value))return {type:'ignored'};
  if(value!==this.question.answer){this.attempts.add(value);this.streak=0;this.hp=Math.max(0,this.hp-12);if(!this.hp)this.state='lost';return {type:'wrong',explanation:this.question.explanation};}
  this.solved=true;this.done++;const first=this.attempts.size===0;if(first){this.correctFirst++;this.streak++;}this.bestStreak=Math.max(this.bestStreak,this.streak);this.hp=Math.min(100,this.hp+8);if(this.streak>0&&this.streak%3===0)this.shield=Math.min(50,this.shield+25);this.score+=100+(first?50:0)+Math.min(this.streak,5)*10;
  this.records.push({expression:this.question.expression,answer:value,skill:this.question.skill,explanation:this.question.explanation,wrongAnswers:[...this.attempts],firstTry:first,hintUsed:this.hintUsed===true,seconds:Math.max(0,Math.round(seconds*10)/10)});
  if(this.done>=this.goal)this.state='complete';return {type:this.state==='complete'?'complete':'correct',first,shield:this.shield};
 }
 damage(amount){if(this.state!=='playing'||!Number.isFinite(amount)||amount<=0)return;const blocked=Math.min(this.shield,amount);this.shield-=blocked;this.hp=Math.max(0,this.hp-(amount-blocked));if(!this.hp)this.state='lost';}
 report(){return {level:this.level,goal:this.goal,done:this.done,score:this.score,accuracy:this.done?Math.round(this.correctFirst/this.done*100):0,bestStreak:this.bestStreak,records:this.records.map(r=>({...r,wrongAnswers:[...r.wrongAnswers]})),complete:this.state==='complete'};}
}
const api={Session};if(typeof module!=='undefined')module.exports=api;else root.IntegerSession=api;
})(globalThis);

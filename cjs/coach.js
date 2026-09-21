(function(root){'use strict';
function numberLine(q){if(q.expression.includes('|')||q.hasGrouping||q.operands.length!==2||/[×÷]/.test(q.expression))return null;const [a,b]=q.operands;const plus=q.expression.includes('+');return {start:a,delta:plus?b:-b};}
function hint(q){if(q.hint)return q.hint;if(q.expression.includes('|'))return '絕對值是數線上到零的距離，不會是負數，零的絕對值是零。先算 | | 裡面的算式，再取絕對值；外面的乘除、加減照順序算，整題答案仍可能是負數。';if(q.hasGrouping)return '先找複合括弧，算完括弧裡的加減，再做乘除。最後才處理外面的加減。';const line=numberLine(q);if(line){const direction=line.delta<0?'向左':'向右';const intro=q.expression.includes('+')?'加上正數向右，加上負數向左。':'減去一個數，等於加上它的相反數。';return intro+`從 ${line.start} 出發，${direction}走 ${Math.abs(line.delta)} 格。`;}
 if(q.operands.length>2)return '先乘除、後加減；同級運算由左到右。先用手指找出第一個要算的部分。';
 return /÷/.test(q.expression)?'先判斷符號：同號為正，異號為負。再用絕對值相除，檢查商乘以除數是否回到被除數。':'同號相乘為正，異號相乘為負。先算兩個數的絕對值，再決定答案前面的正負號。';
}
function selectedHint(q,chosen){if(q.hint)return q.hint;
 if(q.expression.includes('|'))return hint(q);
 if(!Number.isInteger(chosen)||chosen===q.answer)return hint(q);
 const [a,b,c]=q.operands,plain=q.expression.replace(/\(−\d+\)/g,'n');
 if(q.operands.length===2&&!q.hasGrouping){
  if(plain.includes('−')&&b<0&&chosen===a+b)return '先檢查減去負數：減去負數等於加上正數。這裡要向右移動，不是再加上一個負數。';
  if(/[×÷]/.test(plain)&&q.answer!==0&&chosen===-q.answer)return '數字大小算對了，先檢查正負號：同號得正，異號得負。零沒有正負號。';
 }
 if(q.operands.length===3&&!q.hasGrouping&&plain.includes('×')){
  const early=plain.includes('+')?(a+b)*c:(a-b)*c;
  if(chosen===early)return '你選的數字與先加減再乘的結果相同。先圈出乘法，算完後再回來處理前面的加減。';
 }
 if(q.operands.length===3&&q.hasGrouping&&/^(?:n|\d+) − \(/.test(plain)){
  const inside=plain.slice(plain.indexOf(' − (')+4);
  const unchanged=inside.includes('+')?a-b+c:a-b-c;
  if(chosen===unchanged)return '先檢查括弧前的減號：要減去整個括弧的值。可以先把括弧算成一個數；若去括弧，裡面每一項都要改變符號。';
 }
 return hint(q);
}
function mistake(q,attempts,chosen){const solutionShown=attempts>=2;return {solutionShown,title:solutionShown?'一起拆開步驟，生命 −12':'先想觀念，再試一次 · 生命 −12',detail:solutionShown?q.explanation:selectedHint(q,chosen)+' 按「提示」可查看觀念；戰鬥會持續進行。'};}
function reviewPlan(level,records=[],unfinished=null){const mistakes=records.filter(r=>!r.firstTry).slice().reverse().sort((a,b)=>(b.wrongAnswers?.length||0)-(a.wrongAnswers?.length||0));const source=mistakes[0]||unfinished;if(!source)return [level,level];if(source.expression.includes('|'))return [9,level];const expression=source.expression.replace(/\(−\d+\)/g,'n');const basic=expression.includes('÷')?5:expression.includes('×')?4:expression.includes('−')?2:1;return [Math.min(level,basic),level];}
const practiceSkills=['整數加法','減去一數等於加相反數','負數加減','同號得正、異號得負','整除與正負號','加減由左至右','先乘後加減','括弧優先，再乘除後加減','絕對值是到零的距離','先取絕對值再加減','絕對值內先算，再做四則'];
function practiceLevel(skill){const index=practiceSkills.indexOf(skill);return index<0?null:index+1;}
const api={hint,numberLine,mistake,reviewPlan,practiceLevel};if(typeof module!=='undefined')module.exports=api;else root.IntegerCoach=api;
})(globalThis);

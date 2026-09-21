(function(root){'use strict';
// Bounded, detached data only. No storage, DOM, clock, or network access.
const MAX_REPORTS=30,MAX_SCAN_REPORTS=300,MAX_RECORDS=100,MAX_JSON=6000000;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const percent=(first,total)=>total?Math.round(first/total*100):0;
const answerValue=v=>Number.isSafeInteger(v)||(typeof v==='string'&&v.length>0&&v.length<=80);

function cleanRecord(raw){
 if(!object(raw)||typeof raw.expression!=='string'||!raw.expression.length||typeof raw.skill!=='string'||!raw.skill.length||
    !answerValue(raw.answer)||!Array.isArray(raw.wrongAnswers)||typeof raw.firstTry!=='boolean'||
    typeof raw.seconds!=='number'||!Number.isFinite(raw.seconds)||raw.seconds<0)return null;
 const wrongAnswers=[...new Set(raw.wrongAnswers.slice(0,16).filter(n=>answerValue(n)&&typeof n===typeof raw.answer&&n!==raw.answer))];
 return {expression:text(raw.expression,256),answer:raw.answer,skill:text(raw.skill,120),explanation:text(raw.explanation,1000),
  ...(typeof raw.hintUsed==='boolean'?{hintUsed:raw.hintUsed}:{}),wrongAnswers,firstTry:raw.firstTry&&wrongAnswers.length===0,seconds:Math.min(86400,raw.seconds)};
}

function cleanReport(raw){
 if(!object(raw)||!integer(raw.level,1,100)||!integer(raw.goal,1,MAX_RECORDS)||!Array.isArray(raw.records))return null;
 const records=[];
 for(const candidate of raw.records.slice(0,MAX_RECORDS)){const record=cleanRecord(candidate);if(record)records.push(record);}
 let firstTry=0,streak=0,bestStreak=0,score=0;
 for(const record of records){
  if(record.firstTry){firstTry++;streak++;}else streak=0;
  bestStreak=Math.max(bestStreak,streak);
  score+=100+(record.firstTry?50:0)+Math.min(streak,5)*10;
 }
 const date=typeof raw.date==='string'&&raw.date.length<=40&&/^\d{4}-\d{2}-\d{2}T/.test(raw.date)&&Number.isFinite(Date.parse(raw.date))?raw.date:'';
 return {date,level:raw.level,goal:raw.goal,done:records.length,score,accuracy:percent(firstTry,records.length),bestStreak,
  complete:raw.complete===true&&records.length>=raw.goal,review:raw.review===true||raw.practice===true,...(raw.practice===true?{practice:true}:{}),records};
}

function sanitize(raw){
 const result={unlocked:1,reports:[],bestStars:{}};
 if(!object(raw))return result;
 if(Number.isSafeInteger(raw.unlocked)&&raw.unlocked>0)result.unlocked=Math.min(100,raw.unlocked);
 if(object(raw.bestStars))for(let level=1;level<=100;level++)if(integer(raw.bestStars[level],1,3))result.bestStars[level]=raw.bestStars[level];
 if(Array.isArray(raw.reports)){
  // Scan only a bounded tail; retain the newest valid runs within it.
  const lower=Math.max(0,raw.reports.length-MAX_SCAN_REPORTS);
  for(let i=raw.reports.length-1;i>=lower&&result.reports.length<MAX_REPORTS;i--){
   const report=cleanReport(raw.reports[i]);if(report)result.reports.push(report);
  }
  result.reports.reverse();
 }
 for(const report of result.reports)if(report.complete&&!report.review){const stars=report.accuracy===100?3:report.accuracy>=66?2:1;result.bestStars[report.level]=Math.max(result.bestStars[report.level]||0,stars);}
 return result;
}

function decode(json){
 if(typeof json!=='string'||json.length>MAX_JSON)return sanitize(null);
 try{return sanitize(JSON.parse(json));}catch{return sanitize(null);}
}

function summarize(reports){
 const clean=sanitize({reports}).reports,bySkill=new Map();
 let solved=0,firstTry=0;
 for(const report of clean)for(const record of report.records){
  solved++;if(record.firstTry)firstTry++;
  let skill=bySkill.get(record.skill);
  if(!skill){skill={skill:record.skill,solved:0,firstTry:0,accuracy:0,wrongAttempts:0};bySkill.set(record.skill,skill);}
  skill.solved++;if(record.firstTry)skill.firstTry++;
  skill.wrongAttempts+=record.wrongAnswers.length;skill.accuracy=percent(skill.firstTry,skill.solved);
 }
 return {runs:clean.length,solved,firstTry,accuracy:percent(firstTry,solved),skills:[...bySkill.values()]};
}

function csvCell(value){
 // Actual numeric values stay numeric, including negative answers. Text is inert.
 let valueText=String(value);
 if(typeof value==='string'&&/^[=+\-@\t\r\n]/.test(valueText))valueText="'"+valueText;
 return /[",\r\n]/.test(valueText)?'"'+valueText.replace(/"/g,'""')+'"':valueText;
}

function toCSV(reports){
 const rows=[['日期','關卡','模式','題目','正解','首次正確','錯誤選項','活動秒數','觀念','開啟思考提示']];
 for(const report of sanitize({reports}).reports)for(const record of report.records){
  rows.push([report.date,report.level,report.practice?'專項':report.review?'複習':'一般',record.expression,record.answer,
   record.firstTry?'是':'否',record.wrongAnswers.join('、'),record.seconds,record.skill,record.hintUsed===true?'是':record.hintUsed===false?'否':'未記錄']);
 }
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

function preferences(raw){raw=object(raw)?raw:{};const pick=(key,values,fallback)=>values.includes(raw[key])?raw[key]:fallback;return {terrain:pick('terrain',['classic','desert','depot','ice','garden'],'classic'),quality:pick('quality',['0.65','0.85','1.2'],'0.85'),pace:pick('pace',['gentle','normal'],'gentle'),input:pick('input',['auto','touch','desktop'],'auto'),sensitivity:Number.isFinite(raw.sensitivity)?Math.max(.5,Math.min(1.8,Math.round(raw.sensitivity*10)/10)):1,sound:typeof raw.sound==='boolean'?raw.sound:true};}
const api={sanitize,decode,summarize,toCSV,preferences};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IntegerProgress=api;
})(globalThis);

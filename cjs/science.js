(function(root){'use strict';
const titles=['10 的正次方','10 的零與負次方','辨認標準格式','大數轉科學記號','小數轉科學記號','還原大數','還原小數','填係數與指數','修正表示法','萬與億的轉換','同指數比大小','不同指數比大小','位數判斷','分數轉換','單位換算'];
const supers='⁰¹²³⁴⁵⁶⁷⁸⁹',power=n=>String(n).replace('-', '⁻').replace(/\d/g,d=>supers[d]);
const sci=(c,n)=>`${c} × 10${power(n)}`;
function decimal(c,n){return (c*10**n).toFixed(Math.max(0,1-n)).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');}
function curriculum(level){return {title:titles[(level-1)%15],description:'正數的科學記號、轉換、比較與應用',goal:3,grace:0};}
function generate(level,rng=Math.random,previous=''){
 const type=(level-1)%15;let q;
 for(let retry=0;retry<80;retry++){
 const r=(a,b)=>a+Math.floor(((rng()+retry*.61803398875)%1)*(b-a+1));const c=r(11,98)/10,n=r(2,7),k=r(2,6);let expression,answer,wrong,hint='標準科學記號為 a × 10ⁿ，1 ≤ a < 10；移動小數點時，留意指數正負。';
 switch(type){
 case 0:expression=`10${power(n)}＝？`;answer=decimal(1,n);wrong=[decimal(1,n-1),decimal(1,n+1),String(10*n)];break;
 case 1:{const e=-r(0,6);expression=`10${power(e)}＝？`;answer=decimal(1,e);wrong=[decimal(1,e-1),decimal(1,e+1),e===0?'0':String(-(10**(-e)))];hint='10⁰＝1；10 的負次方表示小數，例如 10⁻²＝0.01。';break;}
 case 2:expression='哪個是標準科學記號？';answer=sci(c,n);wrong=[sci(Math.round(c*10),n-1),sci(Number((c/10).toFixed(2)),n+1),`${c} × 100${power(n)}`];break;
 case 3:expression=`${decimal(c,n)}＝？（科學記號）`;answer=sci(c,n);wrong=[sci(c,n-1),sci(c,n+1),sci(c,-n)];break;
 case 4:expression=`${decimal(c,-k)}＝？（科學記號）`;answer=sci(c,-k);wrong=[sci(c,k),sci(c,-k-1),sci(c,-k+1)];break;
 case 5:expression=`${sci(c,n)}＝？（一般數字）`;answer=decimal(c,n);wrong=[decimal(c,n-1),decimal(c,n+1),decimal(c,-n)];break;
 case 6:expression=`${sci(c,-k)}＝？（小數）`;answer=decimal(c,-k);wrong=[decimal(c,-k-1),decimal(c,-k+1),decimal(c,k)];break;
 case 7:expression=`${decimal(c,-k)}＝${c} × 10ⁿ，n＝？`;answer=String(-k);wrong=[String(k),String(-k-1),String(-k+1)];break;
 case 8:expression=`${sci(Math.round(c*10),n-1)} 改成標準格式`;answer=sci(c,n);wrong=[sci(c,n-1),sci(c,n-2),sci(c,n+1)];break;
 case 9:{const amount=r(11,99),unit=r(0,1)?'萬':'億',e=unit==='萬'?5:9;expression=`${amount} ${unit}＝？（科學記號）`;answer=sci(amount/10,e);wrong=[sci(amount/10,e-1),sci(amount/10,e+1),sci(amount/10,e-2)];hint='1 萬＝10000，1 億＝100000000；先確認單位，再轉成標準格式。';break;}
 case 10:{const cs=[c,c+.1,c+.2,c+.3].map(x=>Number(x.toFixed(1)));if(cs[3]>=10){cs[3]=9.9;cs[2]=9.8;cs[1]=9.7;cs[0]=9.6;}expression='選出最大的數';answer=sci(cs[3],n);wrong=cs.slice(0,3).map(x=>sci(x,n));hint='指數相同時，比較前面的係數。';break;}
 case 11:expression='選出最大的數';answer=sci(1.2,-k+1);wrong=[sci(9.1,-k),sci(8.5,-k-1),sci(7.3,-k-2)];hint='都是標準格式的正數時，先比指數；負指數也要按整數大小比較。';break;
 case 12:expression=`${sci(c,-k)}：首個非零數在小數第幾位？`;answer=String(k);wrong=[String(k-1),String(k+1),String(-k)];hint='10⁻¹ 對應小數第 1 位，10⁻² 對應小數第 2 位，依此類推。';break;
 case 13:{const d=[2,4,5,8][r(0,3)],den=d*10**k,co=10/d;expression=`1／${den}＝？（科學記號）`;answer=sci(co,-k-1);wrong=[sci(co,-k),sci(co,k+1),sci(d,-k-1)];hint='先把分數化為小數，再寫成標準科學記號；分母很大，結果會很小。';break;}
 case 14:expression=`${decimal(c,-2)} mm＝？m（1 mm＝0.001 m）`;answer=sci(c,-5);wrong=[sci(c,-2),sci(c,1),sci(c,-4)];hint='毫米換公尺要除以 1000，再用科學記號表示。';break;
 }
 const options=[answer,...wrong];for(let i=3;i>0;i--){const j=r(0,i);[options[i],options[j]]=[options[j],options[i]];}
 q={expression,answer,options,skill:titles[type],hint,explanation:`${hint} 正解：${answer}。`,firstStep:'',operands:[],hasGrouping:false,key:expression+'|'+options.join(';')};if(q.key!==previous)break;
 }return q;
}
const api={titles,generate,curriculum};if(typeof module!=='undefined')module.exports=api;else root.ScienceMath=api;
})(globalThis);

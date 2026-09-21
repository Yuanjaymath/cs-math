(function(root){
  function direction(yaw){return [Math.sin(yaw),-Math.cos(yaw)];}
  function blocked(x,y,z,boxes,height=1.7){return boxes.some(b=>y<b.y+b.h-.01&&y+height>b.y+.05&&x+.3>b.x-b.w/2&&x-.3<b.x+b.w/2&&z+.3>b.z-b.d/2&&z-.3<b.z+b.d/2);}
  function rayBox(o,d,b){
    let near=0,far=Infinity;
    for(let i=0;i<3;i++){const lo=i===0?b.x-b.w/2:i===1?b.y:b.z-b.d/2,hi=i===0?b.x+b.w/2:i===1?b.y+b.h:b.z+b.d/2;if(Math.abs(d[i])<1e-8){if(o[i]<lo||o[i]>hi)return Infinity;continue;}let a=(lo-o[i])/d[i],c=(hi-o[i])/d[i];if(a>c){const swap=a;a=c;c=swap;}near=Math.max(near,a);far=Math.min(far,c);if(near>far)return Infinity;}return near;
  }
  function segmentCollision(a,b,boxes){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz);if(len<1e-10)return null;const direction=[dx/len,dy/len,dz/len],origin=[a.x,a.y,a.z];let nearest=len+1e-7,result=null;for(const box of boxes){const distance=rayBox(origin,direction,box);if(distance<nearest){nearest=distance;result={box,distance};}}return result;}
  function renderDue(active,hidden,now,lastDraw){return !hidden&&(active||now-lastDraw>=250);}
  function incomingSide(yaw,vx,vz){if(Math.hypot(vx,vz)<1e-8)return null;const s=Math.sin(yaw),c=Math.cos(yaw),front=-vx*s+vz*c,right=-vx*c-vz*s;return Math.abs(front)>=Math.abs(right)?(front>=0?'前方':'後方'):(right>=0?'右側':'左側');}
  const enemyRoles=[
    {id:'sentry',name:'機動哨兵',moveX:.75,moveZ:.35,speed:4,warning:.9,cooldown:3.8,color:[.79,.48,.23]},
    {id:'patrol',name:'巡邏兵',moveX:1.2,moveZ:.15,speed:4.2,warning:1,cooldown:4.2,color:[.34,.57,.58]},
    {id:'guard',name:'守衛',moveX:.15,moveZ:.9,speed:3.8,warning:1,cooldown:4,color:[.55,.59,.32]},
    {id:'marksman',name:'狙擊兵',moveX:.8,moveZ:.25,speed:5,warning:1.4,cooldown:5,color:[.57,.43,.62]}
  ];
  const api={direction,blocked,rayBox,segmentCollision,renderDue,incomingSide,enemyRoles};if(typeof module!=='undefined')module.exports=api;else root.Core=api;
})(globalThis);

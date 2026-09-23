(function(root){'use strict';
const maps=[
 {id:'classic',name:'經典競技場',description:'40 × 40 · 四角階梯與環形高台，保留原本場地。'},
 {id:'desert',name:'沙漠哨站',description:'32 × 32 · 矮沙牆、雙哨塔與寬闊中央通道。'},
 {id:'depot',name:'貨櫃基地',description:'32 × 32 · 錯開的貨櫃與短側道，練習找掩護。'},
 {id:'ice',name:'冰原營地',description:'32 × 32 · 冰塊掩體與低平台；地面不打滑。'},
 {id:'garden',name:'階梯庭院',description:'32 × 32 · 對稱花台與低階梯，練習高低移動。'}
];
function compact(id){const boxes=[],vertices=[];const palettes={desert:[[.69,.57,.37],[.78,.67,.46],[.47,.36,.23]],depot:[[.34,.43,.44],[.42,.53,.55],[.21,.31,.33]],ice:[[.72,.83,.85],[.55,.73,.80],[.32,.52,.63]],garden:[[.42,.54,.42],[.68,.68,.53],[.27,.42,.32]]};const [floor,wall,trim]=palettes[id];
 function box(x,y,z,w,h,d,c,solid=true){const b={x,y,z,w,h,d};ArenaRenderer.cube(vertices,b,c);if(solid)boxes.push(b);}
 function steps(x,z,width,count=6){for(let i=0;i<count;i++)box(x,0,z-i*.55,width,(i+1)*.25,.55,wall);}
 box(0,-.35,0,32,.35,32,floor);for(const s of [-1,1]){box(s*16,0,0,1,5,33,wall);box(0,0,s*16,32,5,1,wall);box(s*16,4.8,0,1.1,.25,33,trim);box(0,4.8,s*16,32,.25,1.1,trim);}
 if(id==='desert'){for(const s of [-1,1]){box(s*10,0,-8,4,2,5,wall);steps(s*10,-1.65,3,8);box(s*5,0,-3,3,1.1,1,trim);box(s*13,0,6,2,1.1,4,wall);}box(0,0,-11,5,1.2,2,wall);}
 if(id==='depot'){for(const [x,z,w,d,c] of [[-9,-7,4,8,[.63,.30,.20]],[8,-9,8,4,[.25,.47,.51]],[-3,-12,4,3,[.62,.54,.25]],[11,4,3,5,[.63,.30,.20]]]){box(x,0,z,w,2.7,d,c);for(let k=-1;k<=1;k++)box(x+k*w/4,0,z+d/2+.025,.08,2.7,.04,trim,false);}box(-11,0,5,2,1,3,wall);box(2,0,-3,3,1.1,2,wall);box(-9,0,-.6,3,1,2,wall);steps(-9,2.325,3,4);}
 if(id==='ice'){for(const [x,z,w,h,d] of [[-9,-5,4,1.3,5],[9,-7,5,1.6,4],[-3,-11,3,2.3,3],[4,-2,2,1.1,3],[-12,7,2,1.4,3],[12,6,2,1.1,3]]){box(x,0,z,w,h,d,wall);box(x,h,z,w+.12,.12,d+.12,[.86,.94,.94],false);}box(0,0,-14,8,1,2,trim);steps(0,-11.075,4,4);}
 if(id==='garden'){for(const s of [-1,1]){box(s*9,0,-8,5,1.5,6,wall);steps(s*9,-2.5,3,6);box(s*9,1.5,-9,3,.3,2,trim);box(s*12,0,6,2,1,4,wall);box(s*12,1,6,1.7,.25,3.7,trim,false);}box(0,0,-11,3,1,3,wall);box(0,1,-11,2.6,.2,2.6,trim,false);}
 // The southern answer lane is shared and intentionally unobstructed.
 for(const s of [-1,1])box(s*7.5,.006,7,.07,.006,13,trim,false);
 for(let n=-12;n<=12;n+=4)box(n,.003,0,.015,.003,30,trim,false);
 return {id,boxes,vertices};
}
function create(id='classic'){if(!maps.some(m=>m.id===id))id='classic';if(id!=='classic')return compact(id);const boxes=[],vertices=[];const cube=ArenaRenderer.cube;
 function box(x,y,z,w,h,d,c,solid=true){const b={x,y,z,w,h,d};cube(vertices,b,c);if(solid)boxes.push(b);return b;}
 const stone=[.62,.61,.48],dark=[.36,.43,.40],trim=[.73,.72,.58];
 box(0,-.35,0,40,.35,40,[.47,.51,.45]);
 for(const s of [-1,1]){box(s*20,0,0,1,8,41,stone);box(0,0,s*20,40,8,1,stone);box(s*17,0,0,5,3,38,dark);box(0,0,s*17,29,3,5,dark);box(s*20,7.8,0,1.15,.25,41,trim);box(0,7.8,s*20,40,.25,1.15,trim);}
 for(const sx of [-1,1])for(const sz of [-1,1])for(let i=0;i<12;i++)box(sx*12.75,0,sz*(7.5+i*.6),3.5,(i+1)*.25,.6,[.64,.62,.48]);
 for(const s of [-1,1]){box(s*14.6,3,0,.35,.8,13,trim);box(0,3,s*14.6,18,.8,.35,trim);}
 // Southern lane stays open so every new learner can see four answers.
 box(-5.6,0,-3,1.2,3.3,9,stone);box(5.6,0,-3,1.2,3.3,9,stone);box(0,0,-5,6,2.5,1.1,stone);
 box(0,0,0,2.6,1.1,2,[.41,.46,.31]);box(-8.5,0,-8,3,1.6,2.7,[.41,.46,.31]);box(8.5,0,-8,3,1.6,2.7,[.41,.46,.31]);
 for(let y=1;y<8;y+=1.15)for(const s of [-1,1]){box(s*19.47,y,0,.04,.025,39,[.41,.44,.36],false);box(0,y,s*19.47,39,.025,.04,[.41,.44,.36],false);}
 for(let n=-16;n<=16;n+=8)for(const s of [-1,1]){box(n,3,s*19.35,.7,4.8,.3,trim,false);box(s*19.35,3,n,.3,4.8,.7,trim,false);box(n,6.7,s*19.15,1.8,.16,.2,[.88,.92,.71],false);}
 for(let n=-18;n<=18;n+=3){box(n,.004,0,.012,.004,38,[.39,.43,.37],false);box(0,.005,n,38,.004,.012,[.39,.43,.37],false);}
 for(const x of [-7.5,7.5]){box(x,.012,6,.12,.005,13,[.74,.67,.34],false);for(let z=1;z<13;z+=2)box(x+Math.sign(x)*.45,.015,z,.7,.006,.2,[.72,.65,.36],false);}
 // Architectural skylight beams and blocks create depth without shadows.
 for(const z of [-13,13])box(0,8.2,z,40,.35,.35,[.31,.39,.38],false);
 return {id,boxes,vertices};
}
function step(player,input,boxes,dt,actors=[]){if(actors.length)boxes=boxes.concat(actors.filter(e=>e.alive!==false));const desired=input.crouch;player.crouch=desired||(player.crouch&&Core.blocked(player.x,player.y,player.z,boxes,1.7));
 const f=input.forward,r=input.right,n=Math.max(1,Math.hypot(f,r)),speed=player.crouch?2.1:input.slow?2.6:5.4,[dx,dz]=Core.direction(player.yaw);const height=player.crouch?1.05:1.7;
 function move(axis,delta){let x=player.x,z=player.z;if(axis==='x')x+=delta;else z+=delta;if(!Core.blocked(x,player.y,z,boxes,height)){player[axis]+=delta;return;}if(player.ground){let top=player.y;for(const b of boxes)if(x+.3>b.x-b.w/2&&x-.3<b.x+b.w/2&&z+.3>b.z-b.d/2&&z-.3<b.z+b.d/2&&b.y+b.h<=player.y+.31)top=Math.max(top,b.y+b.h);if(top>player.y&&!Core.blocked(x,top,z,boxes,height)){player.y=top;player[axis]+=delta;}}}
 move('x',(dx*f-dz*r)/n*speed*dt);move('z',(dz*f+dx*r)/n*speed*dt);
 let floor=0,ceiling=Infinity;for(const b of boxes)if(player.x+.29>b.x-b.w/2&&player.x-.29<b.x+b.w/2&&player.z+.29>b.z-b.d/2&&player.z-.29<b.z+b.d/2){if(b.y+b.h<=player.y+.02)floor=Math.max(floor,b.y+b.h);if(b.y>=player.y+height-.05)ceiling=Math.min(ceiling,b.y);}
 player.vy-=16*dt;const nextY=player.y+player.vy*dt;
 if(player.vy>0&&nextY+height>ceiling){player.y=ceiling-height;player.vy=0;}else player.y=nextY;
 if(player.y<=floor){player.y=floor;player.vy=0;player.ground=true;}else player.ground=false;
 if(Math.hypot(f,r)>.05)player.bob+=dt*speed*1.7;
}
function overlaps(a,b){return a.x+a.w/2>b.x-b.w/2+.001&&a.x-a.w/2<b.x+b.w/2-.001&&a.z+a.d/2>b.z-b.d/2+.001&&a.z-a.d/2<b.z+b.d/2-.001&&a.y+a.h>b.y+.001&&a.y<b.y+b.h-.001;}
function canMoveActor(actor,x,z,boxes,player,others=[]){const candidate={...actor,x,z};const playerBox={x:player.x,y:player.y,z:player.z,w:.6,h:player.crouch?1.05:1.7,d:.6};return !overlaps(candidate,playerBox)&&!boxes.some(b=>overlaps(candidate,b))&&!others.some(b=>b!==actor&&b.alive!==false&&overlaps(candidate,b));}
function spawnPoints(player,boxes,rng=Math.random){const result=[];for(let i=0;i<4;i++){const x=(i-1.5)*4.4+(rng()-.5)*.3,base=4.2+rng()*.6;const point=[base,base+3,base-2.8,11.8].map(z=>({x,y:0,z,w:.9,h:2,d:.7})).find(candidate=>Math.hypot(candidate.x-player.x,candidate.z-player.z)>=1.8&&!boxes.some(b=>overlaps(candidate,b))&&!result.some(b=>overlaps(candidate,b)));if(!point)throw Error('No safe robot spawn in training lane');result.push(point);}return result;}
function visible(a,b,boxes){const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=Math.hypot(dx,dy,dz);if(len<.001)return true;
 // One ray per query, reused for every obstacle instead of rebuilt per box.
 const origin=[a.x,a.y,a.z],direction=[dx/len,dy/len,dz/len],limit=len-.08;
 for(const box of boxes)if(Core.rayBox(origin,direction,box)<limit)return false;
 return true;
}
// Half-unit navigation grid is built once per map; routes are reused between updates.
function enemySpeed(level){return Math.min(5.4,2.7+Math.max(0,level-1)*.09);}
function navigation(boxes){
 const floor=boxes.find(b=>b.y<0),limit=Math.floor(Math.min(floor.w,floor.d)/2)-1,nodes=[],grid=new Map();
 for(let ix=-limit*2;ix<=limit*2;ix++)for(let iz=-limit*2;iz<=limit*2;iz++){
  const x=ix/2,z=iz/2;let y=0;for(const b of boxes)if(x+.45>b.x-b.w/2&&x-.45<b.x+b.w/2&&z+.35>b.z-b.d/2&&z-.35<b.z+b.d/2)y=Math.max(y,b.y+b.h);
  const a={x,y,z,w:.9,h:2,d:.7};if(y>3.5||boxes.some(b=>overlaps(a,b)))continue;
  const node={x,y,z,ix,iz,index:nodes.length,edges:[]};nodes.push(node);grid.set(ix+','+iz,node);
 }
 for(const n of nodes)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const b=grid.get((n.ix+dx)+','+(n.iz+dz));if(b&&Math.abs(b.y-n.y)<=.51)n.edges.push(b.index);}
 function nearest(p){let best=null,d=Infinity;for(const n of nodes){const v=(n.x-p.x)**2+(n.z-p.z)**2+4*(n.y-p.y)**2;if(v<d){best=n;d=v;}}return best;}
 function path(a,b){const start=nearest(a),end=nearest(b);if(!start||!end)return [];const prev=new Int32Array(nodes.length).fill(-1),queue=[start.index];prev[start.index]=start.index;for(let i=0;i<queue.length&&prev[end.index]<0;i++)for(const j of nodes[queue[i]].edges)if(prev[j]<0){prev[j]=queue[i];queue.push(j);}if(prev[end.index]<0)return [];const route=[];for(let i=end.index;i!==start.index;i=prev[i])route.push(nodes[i]);route.push(start);return route.reverse();}
 return {nodes,path};
}
function labelLayout(items,width,height,avoid=[],previous=[]){
 const placed=[],overlap=(a,b,gap=6)=>a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;
 const homes=items.map(i=>({id:i.id,x:i.x-Math.min(i.w,width-16)/2,y:i.y-i.h,w:Math.min(i.w,width-16),h:i.h}));
 for(const item of [...items].sort((a,b)=>a.id-b.id)){
  const home=homes.find(r=>r.id===item.id),{w,h}=home,old=previous.find(r=>r.id===item.id),obstacles=[...avoid,...placed];
  const clamp=r=>({...r,x:Math.max(8,Math.min(width-w-8,r.x)),y:Math.max(30,Math.min(height-h-8,r.y))});
  // Keep the head-relative offset until there is ample room to return home.
  const crowded=[...avoid,...homes.filter(r=>r.id!==item.id)].some(r=>overlap(home,r,14));
  let best=clamp({...home,x:home.x+(old&&crowded?old.dx||0:0),y:home.y+(old&&crowded?old.dy||0:0)});
  if(obstacles.some(r=>overlap(best,r))){
   const xs=[best.x,home.x,8,width-w-8],ys=[best.y,home.y,30,height-h-8];
   for(const r of obstacles){xs.push(r.x-w-8,r.x+r.w+8);ys.push(r.y-h-8,r.y+r.h+8);}
   let score=Infinity,candidate=null;
   for(const x of xs)for(const y of ys){const r=clamp({x,y,w,h});if(obstacles.some(o=>overlap(r,o)))continue;const d=(r.x-best.x)**2+(r.y-best.y)**2;if(d<score){score=d;candidate=r;}}
   if(candidate)best=candidate;
  }
  placed.push({...best,id:item.id,dx:best.x-home.x,dy:best.y-home.y});
 }return placed;
}
root.ArenaWorld={maps,create,step,visible,spawnPoints,canMoveActor,enemySpeed,navigation,labelLayout};
})(globalThis);


/* Small WebGL 1 renderer: a static batch and one dynamic batch. No remote dependencies. */
(function(root){'use strict';
const triangleIndices=[0,1,2,0,2,3];
const cubeFaces=[[[0,1,0],[0,1,1],[1,1,1],[1,1,0],1.12],[[0,0,1],[0,0,0],[1,0,0],[1,0,1],.5],[[0,0,0],[0,1,0],[1,1,0],[1,0,0],.79],[[1,0,1],[1,1,1],[0,1,1],[0,0,1],.9],[[0,0,1],[0,1,1],[0,1,0],[0,0,0],.65],[[1,0,0],[1,1,0],[1,1,1],[1,0,1],.95]];
function cube(out,b,color){const x=b.x-b.w/2,X=b.x+b.w/2,y=b.y,Y=b.y+b.h,z=b.z-b.d/2,Z=b.z+b.d/2;
 for(const f of cubeFaces){const r=Math.min(1,color[0]*f[4]),g=Math.min(1,color[1]*f[4]),blue=Math.min(1,color[2]*f[4]);for(const i of triangleIndices){const v=f[i];out.push(v[0]?X:x,v[1]?Y:y,v[2]?Z:z,r,g,blue);}}
}
class Renderer{
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});if(!gl)throw Error('此瀏覽器無法啟動 WebGL。請開啟硬體加速，或使用 Chrome / Edge / Safari。');this.gl=gl;
  const vs='attribute vec3 position;attribute vec3 color;uniform mat4 projection;uniform mat4 view;varying vec3 c;varying float depth;void main(){vec4 p=view*vec4(position,1.);gl_Position=projection*p;c=color;depth=-p.z;}';
  const fs='precision mediump float;varying vec3 c;varying float depth;void main(){float f=smoothstep(16.,64.,depth);gl_FragColor=vec4(mix(c,vec3(.30,.39,.43),f*.60),1.);}';
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);this.p=p;this.pos=gl.getAttribLocation(p,'position');this.col=gl.getAttribLocation(p,'color');this.pu=gl.getUniformLocation(p,'projection');this.vu=gl.getUniformLocation(p,'view');gl.enable(gl.DEPTH_TEST);gl.clearColor(.30,.39,.43,1);
  this.staticBuffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.dynamicCapacity=0;this.projection=new Float32Array(16);this.view=new Float32Array(16);this.quality=.85;this.fov=1.25;this.resize();
 }
 resize(){const scale=this.quality*Math.min(devicePixelRatio||1,1.25);this.canvas.width=Math.max(1,Math.round(innerWidth*scale));this.canvas.height=Math.max(1,Math.round(innerHeight*scale));this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 setScene(vertices){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);this.staticCount=vertices.length/6;}
 camera(player,eye=1.58,zoom=false){const f=1/Math.tan((zoom?.67:this.fov)/2),aspect=this.canvas.width/this.canvas.height,p=this.projection;p.fill(0);p[0]=f/aspect;p[5]=f;p[10]=-1.002;p[11]=-1;p[14]=-.2002;
  const c=Math.cos(player.yaw),s=Math.sin(player.yaw),cp=Math.cos(player.pitch),sp=Math.sin(player.pitch),x=player.x,y=player.y+eye,z=player.z;const right=[c,0,s],up=[-s*sp,cp,c*sp],back=[-s*cp,-sp,c*cp];
  this.view.set([right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,-(right[0]*x+right[2]*z),-(up[0]*x+up[1]*y+up[2]*z),-(back[0]*x+back[1]*y+back[2]*z),1]);
 }
 project(x,y,z){const v=this.view,p=this.projection;const cx=v[0]*x+v[4]*y+v[8]*z+v[12],cy=v[1]*x+v[5]*y+v[9]*z+v[13],depth=-(v[2]*x+v[6]*y+v[10]*z+v[14]);if(depth<.15)return null;return {x:(cx*p[0]/depth*.5+.5)*innerWidth,y:(.5-cy*p[5]/depth*.5)*innerHeight,depth};}
 draw(buffer,count){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(this.pos);gl.enableVertexAttribArray(this.col);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.col,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,count);}
 render(dynamic){const gl=this.gl;gl.uniformMatrix4fv(this.pu,false,this.projection);gl.uniformMatrix4fv(this.vu,false,this.view);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.draw(this.staticBuffer,this.staticCount);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicBuffer);if(dynamic.length>this.dynamicCapacity){this.dynamicCapacity=Math.max(dynamic.length,32768);this.dynamicData=new Float32Array(this.dynamicCapacity);gl.bufferData(gl.ARRAY_BUFFER,this.dynamicCapacity*4,gl.DYNAMIC_DRAW);}this.dynamicData?.set(dynamic);if(dynamic.length)gl.bufferSubData(gl.ARRAY_BUFFER,0,this.dynamicData.subarray(0,dynamic.length));this.draw(this.dynamicBuffer,dynamic.length/6);this.triangles=(this.staticCount+dynamic.length/6)/3;
 }
}
root.ArenaRenderer={Renderer,cube};
})(globalThis);

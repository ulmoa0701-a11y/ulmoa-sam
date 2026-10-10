/*
 * Anatomical-shaped, friendly 3D cortical model.
 * Original parametric educational illustration, NOT a medical segmentation.
 * Anatomical geometry: two continuous cortical surfaces split into color regions
 * AFTER deformation, keeping a single shared set of folds across all lobes.
 * Axis: x = child's left/right, z = forehead (+) / occiput (-), y = up.
 */
import * as THREE from 'three';

const PALETTE = Object.freeze({
  frontal: 0xd3b9f4,
  parietal: 0xffe49c,
  temporal: 0xb0e4bd,
  occipital: 0xffc0a9,
  cerebellum: 0xa5cdf3,
  brainstem: 0xc8bfd4,
});

const RGB = Object.fromEntries(Object.entries(PALETTE).map(([key,value])=>[key,new THREE.Color(value)]));

function regionFor(x, y, z) {
  // Approximate cortical boundaries for parent education, not anatomical atlas.
  if (z < -.82 || (z < -.66 && y < -.12)) return 'occipital';
  if (y < -.16 && z > -.82 && z < .85) return 'temporal';
  if (z > .36) return 'frontal';
  return 'parietal';
}

function cortexPoint(x, y, z, side) {
  const lon = Math.atan2(z, x);
  const lat = Math.asin(Math.max(-1,Math.min(1,y)));
  // 친근한 클레이 일러스트: 둥근 이랑을 살리고 날카롭고 깊은 골은 제거합니다.
  // 회전해도 동일한 주름이 보이도록 표면 정점에서 직접 계산합니다.
  const sweep = lon*10.2 + 2.1*Math.sin(lat*3.1 + lon*.62);
  const cross = lat*11.3 + 1.8*Math.sin(lon*2.4 + lat*.7);
  const flowing = Math.sin(sweep)*.70 + Math.sin(cross)*.30;
  const pillow = .5 + .5*Math.sin(sweep + .4*Math.cos(cross));
  const furrow = Math.pow(Math.max(0,-flowing),1.5);
  // 이전 모델의 깊은 절개형 요철(.125)을 없애고 낮고 둥근 굴곡으로 만듭니다.
  const radius = 1.0 + .063*pillow - .018*furrow;
  const zz = z*1.36*radius;
  const taper = 1-.07*Math.max(0,-z);
  const xx = side * (.545 + x*.533*radius*taper);
  const temporalBulge = Math.exp(-Math.pow((z-.06)/.69,2)) * Math.max(0,-y);
  const yy = .055 + .78*y*radius -.13*temporalBulge;
  // Smoothly flatten the lower-back surface above the cerebellum.
  return [xx,yy,zz,Math.max(.965,1-.035*furrow)];
}

function smoothstep(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function corticalRGB(x,y,z,shade){
 // 부위별 파스텔 영역이 실제로 잘 보이게: 아래 측두엽(민트),
 // 위 두정엽(노랑), 앞 전두엽(라벤더), 뒤 후두엽(살구) 순서입니다.
 const occ=smoothstep(.78,.94,-z);
 const temporal=(1-occ)*(1-smoothstep(-.24,-.035,y))
   *smoothstep(-.92,-.70,z)*(1-smoothstep(.67,.95,z));
 const front=(1-occ)*(1-temporal)*smoothstep(.02,.31,z);
 const parietal=Math.max(0,1-occ-front-temporal);
 const weights=[
  ['frontal',front],['parietal',parietal],
  ['temporal',temporal],['occipital',occ]
 ];
 let red=0,green=0,blue=0;
 for(const [key,w] of weights){
  const col=RGB[key];
  red+=w*col.r;green+=w*col.g;blue+=w*col.b;
 }
 return [red*shade,green*shade,blue*shade];
}
function oneHemisphere(side) {
  const sphere = new THREE.SphereGeometry(1,150,104);
  const pos = sphere.getAttribute('position');
  const shade=[],blended=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const v=cortexPoint(x,y,z,side);
    pos.setXYZ(i,v[0],v[1],v[2]);shade.push(v[3]);blended.push(corticalRGB(v[0],v[1],v[2],v[3]));
  }
  pos.needsUpdate=true;
  sphere.computeVertexNormals();
  const norm = sphere.getAttribute('normal');
  const indices=sphere.getIndex().array;
  const buffers={};
  for(const k of ['frontal','parietal','temporal','occipital'])buffers[k]={p:[],n:[],c:[]};
  for(let k=0;k<indices.length;k+=3){
    const a=indices[k],b=indices[k+1],c=indices[k+2];
    const x=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3;
    const y=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3;
    const z=(pos.getZ(a)+pos.getZ(b)+pos.getZ(c))/3;
    const key=regionFor(x,y,z);
    const v=[a,b,c];
    const g=buffers[key];
    for(const i of v){
      g.p.push(pos.getX(i),pos.getY(i),pos.getZ(i));
      g.n.push(norm.getX(i),norm.getY(i),norm.getZ(i));
      g.c.push(...blended[i]);
    }
  }
  sphere.dispose();
  const out=[];
  for(const [key,b] of Object.entries(buffers)){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(b.c,3));
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    out.push({key,side:side===1?'left':'right',geometry,anchor:geometry.boundingBox.getCenter(new THREE.Vector3())});
  }
  return out;
}

function cerebellumGeometry(side){
  const shape=new THREE.SphereGeometry(1,100,62);
  const position=shape.getAttribute('position'),color=[];
  const baseX=side*.39;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    // 부드러운 소뇌 줄무늬: 조개껍데기처럼 잔잔한 가로 굴곡.
    const ridge=(.5+.5*Math.sin(y*23+Math.sin(x*3+z*2)*.8));
    const depth=1-.018*Math.pow(1-ridge,2);
    position.setXYZ(i,baseX+x*.42*depth,-.69+y*.30*depth,-.98+z*.43*depth);
    color.push(.965+.035*ridge);
  }
  position.needsUpdate=true;shape.computeVertexNormals();
  const fullColors=new Float32Array(position.count*3);
  for(let i=0;i<position.count;i++)fullColors.set([color[i],color[i],color[i]],i*3);
  shape.setAttribute('color',new THREE.BufferAttribute(fullColors,3));
  shape.computeBoundingBox();
  return {key:'cerebellum',side:side===1?'left':'right',geometry:shape,anchor:shape.boundingBox.getCenter(new THREE.Vector3())};
}

function stemGeometry(){
  // Continuous tapered stem with a slight forward curve, not a dangling ellipse.
  const contour=[
    [0.00,-1.68],[.16,-1.59],[.19,-1.45],[.23,-1.26],
    [.25,-1.08],[.27,-.92],[.25,-.76],[.14,-.69],[0,-.67]
  ].map(([r,y])=>new THREE.Vector2(r,y));
  const geometry=new THREE.LatheGeometry(contour,56,0,Math.PI*2);
  const pos=geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i);
    pos.setZ(i,pos.getZ(i)-.30+.12*(y+1.2));
  }
  pos.needsUpdate=true;geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return {key:'brainstem',side:'center',geometry,anchor:geometry.boundingBox.getCenter(new THREE.Vector3())};
}

export function makeBrainSurfaces(){
  const descriptors=[
    ...oneHemisphere(1),
    ...oneHemisphere(-1),
    cerebellumGeometry(1),cerebellumGeometry(-1),stemGeometry()
  ];
  return descriptors.map(d=>{
    const material=new THREE.MeshStandardMaterial({
      color:['frontal','parietal','temporal','occipital'].includes(d.key)?0xffffff:PALETTE[d.key],
      vertexColors:d.key!=='brainstem',
      roughness:.97,metalness:0,
      side:THREE.DoubleSide,emissive:0x000000
    });
    const mesh=new THREE.Mesh(d.geometry,material);
    mesh.userData={key:d.key,side:d.side,base:new THREE.Vector3(),anchor:d.anchor};
    mesh.castShadow=false;
    return mesh;
  });
}

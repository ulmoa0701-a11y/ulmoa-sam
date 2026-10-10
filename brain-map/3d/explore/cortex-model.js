/*
 * Anatomical-shaped, friendly 3D cortical model.
 * Original parametric educational illustration, NOT a medical segmentation.
 * Anatomical geometry: two continuous cortical surfaces split into color regions
 * AFTER deformation, keeping a single shared set of folds across all lobes.
 * Axis: x = child's left/right, z = forehead (+) / occiput (-), y = up.
 */
import * as THREE from 'three';

const PALETTE = Object.freeze({
  frontal: 0xd9c2ff,
  parietal: 0xffe89a,
  temporal: 0xbeebc7,
  occipital: 0xffc8b2,
  cerebellum: 0xafcfff,
  brainstem: 0xd7cce8,
});

const RGB = Object.fromEntries(Object.entries(PALETTE).map(([key,value])=>[key,new THREE.Color(value)]));

function regionFor(x, y, z) {
  // Approximate cortical boundaries for parent education, not anatomical atlas.
  if (z < -.77) return 'occipital';
  if (y < -.14 && z > -.76 && z < .79) return 'temporal';
  if (z > .24) return 'frontal';
  return 'parietal';
}

function cortexPoint(x, y, z, side) {
  const lon=Math.atan2(z,x);
  const lat=Math.asin(Math.max(-1,Math.min(1,y)));
  // 말랑한 교육 교구: 넓은 굴곡 3~5개만 남기고 잔주름과 날카로운 홈은 제거합니다.
  // 위치 계산은 동일한 한 겹의 연속 표면 위에서 이루어져 회전·분리가 가능합니다.
  const taperAtPoles=Math.pow(Math.max(0,Math.cos(lat)),1.4);
  const broad=.5+.5*Math.sin(lon*4.2+.75*Math.sin(lat*1.8));
  const secondary=.5+.5*Math.sin(lat*4.6+.60*Math.sin(lon*1.5));
  const cushion=.75*broad+.25*secondary;
  const radius=1+.070*cushion*taperAtPoles;
  const taper=1-.035*Math.max(0,-z);
  const xx=side*(.54+x*.52*radius*taper);
  const zz=z*1.22*radius;
  const temporalBulge=Math.exp(-Math.pow((z-.12)/.70,2))*Math.max(0,-y);
  const yy=.085+y*.74*radius-.045*temporalBulge;
  return [xx,yy,zz,.995];
}
function smoothstep(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function corticalRGB(x,y,z,shade){
  // 같은 그림체의 또렷한 파스텔 컬러 블록. 경계는 짧은 폭으로만 부드럽게 연결합니다.
  const occ=smoothstep(.72,.83,-z);
  const temporal=(1-occ)*(1-smoothstep(-.19,-.09,y))
    *smoothstep(-.80,-.69,z)*(1-smoothstep(.74,.84,z));
  const front=(1-occ)*(1-temporal)*smoothstep(.19,.29,z);
  const parietal=Math.max(0,1-occ-temporal-front);
  const weights=[['frontal',front],['parietal',parietal],
    ['temporal',temporal],['occipital',occ]];
  let red=0,green=0,blue=0;
  for(const [key,w] of weights){
    const color=RGB[key];
    red+=w*color.r;green+=w*color.g;blue+=w*color.b;
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
    // 소뇌도 하늘색 찹쌀떡 형태로: 의학적인 잔주름을 완전히 제거합니다.
    const depth=1;
    position.setXYZ(i,baseX+x*.36*depth,-.62+y*.26*depth,-.89+z*.35*depth);
    color.push(.995);
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
    [0.00,-1.32],[.13,-1.27],[.17,-1.15],[.18,-1.00],
    [.17,-.85],[.12,-.73],[0,-.72]
  ].map(([r,y])=>new THREE.Vector2(r,y));
  const geometry=new THREE.LatheGeometry(contour,56,0,Math.PI*2);
  const pos=geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i);
    pos.setZ(i,pos.getZ(i)-.24+.07*(y+1.0));
  }
  pos.needsUpdate=true;geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return {key:'brainstem',side:'center',geometry,anchor:geometry.boundingBox.getCenter(new THREE.Vector3())};
}

// 승인된 그림체처럼 굵고 둥근 뇌 이랑을 몇 가닥만 살짝 그립니다.
// 진짜 해부학적 고랑을 깊이 파지 않고, 회전·부위 이동에 함께 붙는 3D 곡선입니다.
function makeFriendlyRidges(mesh,d){
  if(!['frontal','parietal','temporal','occipital'].includes(d.key))return;
  const tracks={
    frontal:[
      [[.75,.24],[.66,.35],[.54,.38],[.42,.31]],
      [[.69,-.16],[.59,-.06],[.46,.00],[.36,-.09]]
    ],
    parietal:[
      [[.17,.64],[.06,.66],[-.12,.59],[-.28,.57]],
      [[.15,.23],[.02,.32],[-.18,.27],[-.34,.35]]
    ],
    temporal:[
      [[.36,-.35],[.18,-.44],[.00,-.42],[-.20,-.40]],
      [[.29,-.54],[.12,-.57],[-.09,-.54],[-.23,-.49]]
    ],
    occipital:[
      [[-.51,.40],[-.60,.34],[-.66,.22],[-.71,.12]]
    ]
  };
  const lineColors={
    frontal:0xab82dc,parietal:0xdbb652,temporal:0x70bd85,occipital:0xe49e84
  };
  const side=d.side==='left'?1:-1;
  const material=new THREE.MeshBasicMaterial({
    color:lineColors[d.key],transparent:true,opacity:.34,depthWrite:false
  });
  for(const line of tracks[d.key]){
    const points=line.map(([z,y])=>{
      const x=Math.sqrt(Math.max(.02,1-y*y-z*z));
      const [X,Y,Z]=cortexPoint(x,y,z,side);
      return new THREE.Vector3(X+side*.021,Y,Z);
    });
    const path=new THREE.CatmullRomCurve3(points);
    const tube=new THREE.Mesh(new THREE.TubeGeometry(path,28,.012,6,false),material);
    tube.userData.decorative=true;
    tube.renderOrder=1;
    mesh.add(tube);
  }
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
      roughness:1.0,metalness:0,
      side:THREE.DoubleSide,emissive:0x000000
    });
    const mesh=new THREE.Mesh(d.geometry,material);
    mesh.userData={key:d.key,side:d.side,base:new THREE.Vector3(),anchor:d.anchor};
    makeFriendlyRidges(mesh,d);
    mesh.castShadow=false;
    return mesh;
  });
}

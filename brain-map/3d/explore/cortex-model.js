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

// Each raised fold is part of the SAME cortex geometry. This sculpts a cheerful,
// softly scalloped brain silhouette rather than layering separate blob objects.
const TOY_FOLDS=Object.freeze([
  // upper rim
  [.56,.66,.20,.21,.172],[.60,.22,.20,.23,.17],
  [.57,-.22,.20,.22,.17],[.54,-.60,.20,.22,.16],
  // middle band; staggered so each curl has an organic S-like rhythm
  [.15,.83,.20,.19,.17],[.14,.42,.20,.21,.17],
  [.10,.00,.20,.22,.17],[.12,-.43,.20,.21,.17],
  [.08,-.82,.20,.19,.13],
  // lower edge of the lateral side
  [-.28,.64,.21,.19,.16],[-.30,.24,.20,.21,.16],
  [-.29,-.18,.20,.21,.16],[-.25,-.57,.22,.20,.14]
]);
function cortexPoint(x,y,z,side){
  const lon=Math.atan2(z,x),lat=Math.asin(Math.max(-1,Math.min(1,y)));
  let relief=0;
  for(const [cy,cz,wy,wz,height] of TOY_FOLDS){
    const dy=(y-cy)/wy,dz=(z-cz)/wz;
    relief+=height*Math.exp(-1.9*(dy*dy+dz*dz));
  }
  const edge=Math.pow(Math.max(0,Math.cos(lat)),.65);
  const radius=1+.58*relief*edge+.009*Math.cos(5*lon+.4*Math.sin(2.6*lat))*edge;
  const xx=side*(.545+x*.527*radius*(1-.035*Math.max(0,-z)));
  const zz=z*1.25*radius;
  const lower=Math.exp(-Math.pow((z-.06)/.70,2))*Math.max(0,-y);
  const yy=.09+y*.75*radius-.055*lower;
  // Gentle shaded seams around the molded curls (not cut grooves).
  const shade=1-.022*Math.max(0,1-relief/.145);
  return [xx,yy,zz,shade];
}
function smoothstep(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
// Gentle cartoon brain curls follow the mesh as vertex shading.
// A few smooth mint/lavender swirls read as "brain" without biological grooves.
const CURLS=[
 [[.57,.74],[.37,.51],[.54,.32]],
 [[.10,.78],[-.06,.55],[.17,.32]],
 [[-.34,.65],[-.18,.42],[-.36,.20]],
 [[.64,.17],[.39,.12],[.55,-.12]],
 [[.15,.08],[.34,-.16],[.13,-.32]],
 [[-.38,.08],[-.19,-.20],[-.42,-.46]],
 [[.58,-.42],[.36,-.60],[.15,-.44]],
 [[.16,-.73],[-.05,-.54],[-.22,-.73]]
];
const CURL_SEGMENTS=CURLS.map(([a,b,c])=>{
 const points=[];
 for(let i=0;i<=12;i++){
  const t=i/12,u=1-t;
  points.push([u*u*a[0]+2*u*t*b[0]+t*t*c[0],u*u*a[1]+2*u*t*b[1]+t*t*c[1]]);
 }
 return points;
});
function curlInk(y,z,x){
 // Only faintly on the outward sides; end-on views stay uncluttered.
 const fade=smoothstep(.32,.59,Math.abs(x));
 if(fade<=0)return 0;
 let min=9;
 for(const points of CURL_SEGMENTS){
  for(let i=0;i<points.length-1;i++){
   const a=points[i],b=points[i+1],dy=b[0]-a[0],dz=b[1]-a[1];
   const u=Math.max(0,Math.min(1,((y-a[0])*dy+(z-a[1])*dz)/(dy*dy+dz*dz+1e-10)));
   const py=a[0]+dy*u,pz=a[1]+dz*u;
   const dd=(y-py)*(y-py)+(z-pz)*(z-pz);
   if(dd<min)min=dd;
  }
 }
 return fade*Math.exp(-min/.0016);
}
function corticalRGB(x,y,z,shade,sourceX,sourceY,sourceZ){
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
  const softOutline=1-.135*curlInk(sourceY,sourceZ,sourceX);
  return [red*shade*softOutline,green*shade*softOutline,blue*shade*softOutline];
}

function oneHemisphere(side) {
  const sphere = new THREE.SphereGeometry(1,150,104);
  const pos = sphere.getAttribute('position');
  const shade=[],blended=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const v=cortexPoint(x,y,z,side);
    pos.setXYZ(i,v[0],v[1],v[2]);shade.push(v[3]);blended.push(corticalRGB(v[0],v[1],v[2],v[3],x,y,z));
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
    position.setXYZ(i,side*.31+x*.34*depth,-.53+y*.26*depth,-.66+z*.37*depth);
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
    [0.00,-.99],[.10,-.97],[.14,-.91],[.165,-.77],
    [.17,-.59],[.13,-.45],[0,-.42]
  ].map(([r,y])=>new THREE.Vector2(r,y));
  const geometry=new THREE.LatheGeometry(contour,56,0,Math.PI*2);
  const pos=geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i);
    pos.setZ(i,pos.getZ(i)-.38+.045*(y+.8));
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
      roughness:1.0,metalness:0,
      side:THREE.DoubleSide,emissive:0x000000
    });
    const mesh=new THREE.Mesh(d.geometry,material);
    mesh.userData={key:d.key,side:d.side,base:new THREE.Vector3(),anchor:d.anchor};
    mesh.castShadow=false;
    return mesh;
  });
}

/*
 * Anatomical-shaped, friendly 3D cortical model.
 * Original parametric educational illustration, NOT a medical segmentation.
 * Anatomical geometry: two continuous cortical surfaces split into color regions
 * AFTER deformation, keeping a single shared set of folds across all lobes.
 * Axis: x = child's left/right, z = forehead (+) / occiput (-), y = up.
 */
import * as THREE from 'three';

const PALETTE = Object.freeze({
  frontal: 0xc6a3ef,
  parietal: 0xf4d778,
  temporal: 0x9edcaa,
  occipital: 0xf2aa90,
  cerebellum: 0x90bfeb,
  brainstem: 0xb0a8bd,
});

function regionFor(x, y, z) {
  // Approximate cortical boundaries for parent education, not anatomical atlas.
  if (z < -0.79 || (z < -.55 && y < -.12)) return 'occipital';
  if (y < -.32 && z > -.70) return 'temporal';
  if (z > .40 || (z > .08 && y < .18)) return 'frontal';
  return 'parietal';
}

function cortexPoint(x, y, z, side) {
  const lon = Math.atan2(z, x);
  const lat = Math.asin(Math.max(-1,Math.min(1,y)));
  // Long, organically turning grooves across a single continuous hemisphere.
  // Ridge spacing has two spatial frequencies; darkened sulci stay subtle.
  const turns = 11.7 * lon + 2.9*Math.sin(lat*3.8) + 1.4*Math.sin(lat*7.3+lon*1.6);
  const cross = 12.8*lat + 2.2*Math.sin(lon*3.7-lat*1.2);
  const path = Math.sin(turns)*.65 + Math.sin(cross)*.35;
  const sulcus = Math.pow(Math.max(0,-path),2.1);
  const ripple = Math.sin(5.1*lon + 2.5*lat)*.012;
  const radius = 1.018 - .082*sulcus + ripple;
  const zz = z*1.36*radius;
  const taper = 1-.07*Math.max(0,-z);
  const xx = side * (.545 + x*.533*radius*taper);
  const temporalBulge = Math.exp(-Math.pow((z-.06)/.69,2)) * Math.max(0,-y);
  const yy = .055 + .78*y*radius -.13*temporalBulge;
  // Smoothly flatten the lower-back surface above the cerebellum.
  return [xx,yy,zz,Math.max(0,Math.min(1,1-sulcus*.23))];
}

function appendFace(group,vertices,normals,colors,a,b,c,base) {
  for(const index of [a,b,c]){
    const vi=index*3;
    group.p.push(vertices[vi],vertices[vi+1],vertices[vi+2]);
    group.n.push(normals[vi],normals[vi+1],normals[vi+2]);
    const shade=base[index];
    group.c.push(shade,shade,shade);
  }
}

function oneHemisphere(side) {
  const sphere = new THREE.SphereGeometry(1,150,104);
  const pos = sphere.getAttribute('position');
  const shade=[];
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const v=cortexPoint(x,y,z,side);
    pos.setXYZ(i,v[0],v[1],v[2]);shade.push(v[3]);
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
      const factor=shade[i];g.c.push(factor,factor,factor);
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
    // Fine, horizontal folia: the cerebellum is not a smooth blue ball.
    const ridge=(.5+.5*Math.sin(y*41+Math.sin(x*4+z*3)*1.6));
    const depth=1-.052*Math.pow(1-ridge,2);
    position.setXYZ(i,baseX+x*.42*depth,-.69+y*.30*depth,-.98+z*.43*depth);
    color.push(.84+.16*ridge);
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
    const material=new THREE.MeshPhysicalMaterial({
      color:PALETTE[d.key],vertexColors:d.key!=='brainstem',
      roughness:.68,metalness:0,clearcoat:.11,clearcoatRoughness:.77,
      side:THREE.DoubleSide,emissive:0x000000
    });
    const mesh=new THREE.Mesh(d.geometry,material);
    mesh.userData={key:d.key,side:d.side,base:new THREE.Vector3(),anchor:d.anchor};
    mesh.castShadow=false;
    return mesh;
  });
}

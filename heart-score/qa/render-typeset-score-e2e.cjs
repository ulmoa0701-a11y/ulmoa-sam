/* Generate a fresh, fully typeset 19-measure score for independent image E2E.
 * Uses only the public notation ground truth; never reuses model output.
 * Outputs are generated at CI runtime and never checked into Git.
 */
const fs=require('node:fs'), path=require('node:path');
const {chromium}=require('playwright');
const truth=require('./doremi-ground-truth.json');
(async()=>{
 const out=path.resolve(process.argv[2]||path.join(__dirname,'.qa-generated'));
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1940,height:1600}});
  await page.setContent('<html><body><canvas id="score"></canvas></body></html>');
  // Embed font bytes from free npm packages, avoiding unavailable system fonts/network timing.
  const fontData={};
  for(const font of ['bravura','academico']){
    fontData[font]=fs.readFileSync(path.join(__dirname,'node_modules/@vexflow-fonts',font,font+'.woff2')).toString('base64');
  }
  await page.addStyleTag({content:
    "@font-face{font-family:Bravura;src:url(data:font/woff2;base64,"+fontData.bravura+") format('woff2')}"+
    "@font-face{font-family:Academico;src:url(data:font/woff2;base64,"+fontData.academico+") format('woff2')}"
  });
  await page.evaluate(async()=>{await Promise.all([document.fonts.load('20px Bravura'),document.fonts.load('20px Academico')]);});
  await page.addScriptTag({path:path.join(__dirname,'node_modules/vexflow/build/cjs/vexflow.js')});
  const pictures=await page.evaluate(async truth=>{
   const VF=window.VexFlow||window.Vex?.Flow;
   if(!VF?.Renderer)throw Error('VexFlow renderer unavailable');
   if(typeof VF.setFonts!=='function')throw Error('Top-level VexFlow.setFonts is missing');
   VF.setFonts('Bravura','Academico');
   await document.fonts.ready;
   if(!document.fonts.check('20px Bravura'))throw Error('Bravura font was not loaded');
   const c=document.getElementById('score'),w=1800,h=1480;
   c.width=w;c.height=h;
   const renderer=new VF.Renderer(c,VF.Renderer.Backends.CANVAS);
   renderer.resize(w,h);const ctx=renderer.getContext();
   ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
   const scoreRows=truth.perLine,notes=truth.measures,inside=[];
   const pitchKey=raw=>{
     if(raw==='쉼')return {key:'b/4',acc:null};
     const high=raw.startsWith('높은'),s=raw.replace(/^높은/,'').replace(/[#♭]/g,'');
     const letters={'도':'c','레':'d','미':'e','파':'f','솔':'g','라':'a','시':'b'};
     const octave=high?'5':'4';
     const acc=raw.endsWith('#')?'#':raw.endsWith('♭')?'b':null;
     return{key:letters[s]+(acc||'')+'/'+octave,acc};
   };
   const duration=d=>({'.5':'8','1':'q','1.5':'qd','2':'h','3':'hd','4':'w'}[String(d)]||'q');
   let index=0;const barPositions=[];
   for(let row=0;row<scoreRows.length;row++){
    const count=scoreRows[row],width=1610/count,y=105+row*252;
    for(let mi=0;mi<count;mi++){
      const x=95+mi*width;
      const stave=new VF.Stave(x,y,width);
      if(mi===0)stave.addClef('treble').addTimeSignature('4/4');
      stave.setContext(ctx).draw();
      const n=notes[index++].map(item=>{
       const dur=duration(item.dur),rest=item.note==='쉼',p=pitchKey(item.note);
       const note=new VF.StaveNote({clef:'treble',keys:[p.key],duration:dur+(rest?'r':'')});
       if(p.acc)note.addModifier(new VF.Accidental(p.acc),0);
       if(dur.endsWith('d'))VF.Dot.buildAndAttach([note],{all:true});
       return note;
      });
      const voice=new VF.Voice({num_beats:4,beat_value:4}).setMode(VF.Voice.Mode.SOFT);
      voice.addTickables(n);
      const space=stave.getNoteEndX()-stave.getNoteStartX()-14;
      new VF.Formatter().joinVoices([voice]).format([voice],Math.max(110,space));
      voice.draw(ctx,stave);
      // Some headless Canvas VexFlow builds render only stems when glyph fallback fails.
      // Guarantee that this independent pixel fixture contains every symbol before OMR:
      const native=c.getContext('2d',{willReadFrequently:true}),actual=notes[index-1];
      const noteY=stave.getYForLine(0);
      for(let ni=0;ni<n.length;ni++){
        const item=actual[ni],note=n[ni],ys=note.getYs(),direction=note.getStemDirection()||1;
        const sx=note.getStemX(),cx=sx-6.1*direction,cy=ys[0];
        native.save();native.strokeStyle='#111';native.fillStyle='#111';native.lineWidth=1.4;
        if(item.note==='쉼'){
          const rx=note.getAbsoluteX()+7,ry=stave.getYForLine(2),r=item.dur;
          // Native SMuFL rest symbol from locally embedded Bravura font.
          // SVG/text fallback is deliberately NOT a generic Z; the model must see a real rest.
          native.font='32px Bravura'; native.textAlign='center'; native.textBaseline='middle';
          native.fillText(String.fromCodePoint(r>=1?0xE4E5:0xE4E6),rx,ry);
          native.textAlign='left'; native.textBaseline='alphabetic';
        }else{
          native.beginPath();native.ellipse(cx,cy,6.6,4.6,-.28,0,Math.PI*2);
          if(item.dur>=2){native.fillStyle='#fff';native.fill();native.stroke();native.fillStyle='#111';}else native.fill();
          if(item.dur===1.5||item.dur===3){native.beginPath();native.arc(cx+12,cy-2,1.8,0,Math.PI*2);native.fill();}
          if(item.note.includes('#')||item.note.includes('♭')){
             native.font='bold 18px Arial, sans-serif';
             native.fillText(item.note.includes('#')?'#':'♭',cx-18,cy+6);
          }
          if(item.dur===.5){
            const ex=sx,ey=cy-direction*33;
            native.beginPath();native.moveTo(ex,ey);native.quadraticCurveTo(ex+direction*16,ey+4,ex+direction*10,ey+14);native.stroke();
          }
        }
        native.restore();
      }
      if(mi===0){
        const gc=stave.getX()+30,gy=stave.getYForLine(2);native.save();
        native.strokeStyle='#111';native.lineWidth=2;
        native.beginPath();native.moveTo(gc,gy+26);native.bezierCurveTo(gc-16,gy+2,gc+18,gy-19,gc+5,gy-29);
        native.bezierCurveTo(gc-15,gy-42,gc-4,gy+18,gc+11,gy+7);
        native.bezierCurveTo(gc+29,gy-5,gc+8,gy-25,gc-1,gy-7);native.stroke();
        native.restore();
      }
      if(mi<count-1){
        const by0=stave.getYForLine(0),by1=stave.getYForLine(4),bx=x+width-.8;
        native.save();native.strokeStyle='#222';native.lineWidth=1.6;
        native.beginPath();native.moveTo(bx,by0);native.lineTo(bx,by1);native.stroke();native.restore();
        barPositions.push({x:bx,y:by0,bottom:by1});
      }
    }
   }
   if(index!==19)throw Error('Expected 19 real measures, got '+index);
   const cropDefs=[
     {id:'bar11-sharp',x:1050,y:633,w:160,h:103},
     {id:'bar13-natural',x:400,y:887,w:130,h:108},
     {id:'bar14-flat',x:795,y:887,w:130,h:108},
     {id:'bar15-natural',x:1065,y:887,w:150,h:108},
     {id:'bar9-natural',x:400,y:633,w:130,h:108}
   ];
   const cropImages=cropDefs.map(d=>{
     const t=document.createElement('canvas');t.width=d.w*3;t.height=d.h*3;
     const tc=t.getContext('2d');tc.imageSmoothingEnabled=false;
     tc.fillStyle='#fff';tc.fillRect(0,0,t.width,t.height);
     tc.drawImage(c,d.x,d.y,d.w,d.h,0,0,t.width,t.height);
     return{id:d.id,base64:t.toDataURL('image/png').split(',')[1]};
   });
   const normal=c.toDataURL('image/png').split(',')[1];
   const thumb=document.createElement('canvas');thumb.width=900;thumb.height=740;
   thumb.getContext('2d').drawImage(c,0,0,900,740);
   const thumbnail=thumb.toDataURL('image/jpeg',.55).split(',')[1];
   // Simulate thin, faint scan barlines without erasing noteheads or shortening staves:
   // repaint only a 5px region spanning the four staff interlines, then restore all
   // five continuous horizontal staff lines and draw a pale full-height barline.
   const ic=c.getContext('2d',{willReadFrequently:true});
   for(const b of barPositions){
     const x=Math.round(b.x);
     ic.fillStyle='white';ic.fillRect(x-2,b.y+1,5,b.bottom-b.y-1);
     ic.strokeStyle='#1e1e1e';ic.lineWidth=1;
     for(let i=0;i<5;i++){const yy=b.y+(b.bottom-b.y)*i/4;ic.beginPath();ic.moveTo(x-2,yy);ic.lineTo(x+3,yy);ic.stroke();}
     ic.strokeStyle='rgb(221,221,221)';ic.lineWidth=1;
     ic.beginPath();ic.moveTo(x,b.y);ic.lineTo(x,b.bottom);ic.stroke();
   }
   const faint=c.toDataURL('image/png').split(',')[1];
   return {normal,faint,thumbnail,cropImages,count:index,width:w,height:h,bars:barPositions.length};
  },truth);
  console.log('SCORE_THUMBNAIL_BASE64='+pictures.thumbnail);
  for(const c of pictures.cropImages)console.log('SCORE_CROP_BASE64 '+c.id+' '+c.base64);
  const first=path.join(out,'typeset-normal-19.png'),second=path.join(out,'typeset-faint-19.png');
  fs.writeFileSync(first,Buffer.from(pictures.normal,'base64'));
  fs.writeFileSync(second,Buffer.from(pictures.faint,'base64'));
  // More realistic acquisition conditions than clean rendered PNG:
  // native-resolution compression/downscale and slight handheld-camera tilt.
  // Generated from the same independent score, NOT reconstructed from OMR output.
  const disturbed=await page.evaluate(async base64=>{
    const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();
    const smaller=document.createElement('canvas');smaller.width=1150;smaller.height=946;
    const low=smaller.getContext('2d');low.fillStyle='#fff';low.fillRect(0,0,1150,946);low.imageSmoothingEnabled=true;low.imageSmoothingQuality='high';low.drawImage(img,0,0,1150,946);
    const tilted=document.createElement('canvas');tilted.width=1760;tilted.height=1480;
    const ctx=tilted.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1760,1480);
    ctx.translate(880,740);ctx.rotate(Math.PI*1.3/180);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,-850,-700,1700,1400);
    // Exercise resize on already-compressed JPEG, not pristine vector PNG.
    const compressed=new Image();compressed.src=smaller.toDataURL('image/jpeg',.68);await compressed.decode();
    const restored=document.createElement('canvas');restored.width=1800;restored.height=1480;
    const rc=restored.getContext('2d');rc.fillStyle='#fff';rc.fillRect(0,0,1800,1480);rc.imageSmoothingEnabled=true;rc.imageSmoothingQuality='high';
    rc.drawImage(compressed,0,0,1800,1480);
    return{lowres:smaller.toDataURL('image/jpeg',.68).split(',')[1],tilted:tilted.toDataURL('image/jpeg',.74).split(',')[1],upscaled:restored.toDataURL('image/png').split(',')[1]};
  },pictures.normal);
  const lowresPath=path.join(out,'typeset-lowres-19.jpg'),tiltedPath=path.join(out,'typeset-tilted-19.jpg');
  fs.writeFileSync(lowresPath,Buffer.from(disturbed.lowres,'base64'));
  fs.writeFileSync(tiltedPath,Buffer.from(disturbed.tilted,'base64'));
  const restoredPath=path.join(out,'typeset-jpeg-upscaled-19.png');
  fs.writeFileSync(restoredPath,Buffer.from(disturbed.upscaled,'base64'));
  console.log('DISTURBED_FIXTURE '+JSON.stringify({lowres:lowresPath,tilted:tiltedPath,source:'independent typeset score'}));
  console.log(JSON.stringify({generated:true,fullNotation:{measures:truth.measures.length,notes:truth.noteCount,rests:truth.restCount,perLine:truth.perLine},drawn:{measures:pictures.count,internalBarlines:pictures.bars},files:[first,second],size:[pictures.width,pictures.height]}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1;});

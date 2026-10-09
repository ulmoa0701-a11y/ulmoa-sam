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
  await page.addScriptTag({path:path.join(__dirname,'node_modules/vexflow/build/cjs/vexflow.js')});
  const pictures=await page.evaluate(async truth=>{
   const VF=window.Vex?.Flow||window.VexFlow?.Flow||window.VexFlow;
   if(!VF?.Renderer)throw Error('VexFlow renderer unavailable');
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
       if(p.acc)note.addAccidental(0,new VF.Accidental(p.acc));
       if(dur.endsWith('d'))VF.Dot.buildAndAttach([note],{all:true});
       return note;
      });
      const voice=new VF.Voice({num_beats:4,beat_value:4});
      voice.addTickables(n);
      const space=stave.getNoteEndX()-stave.getNoteStartX()-14;
      new VF.Formatter().joinVoices([voice]).format([voice],Math.max(110,space));
      voice.draw(ctx,stave);
      if(mi<count-1)barPositions.push({x:x+width,y:stave.getYForLine(0),bottom:stave.getYForLine(4)});
    }
   }
   if(index!==19)throw Error('Expected 19 real measures, got '+index);
   const normal=c.toDataURL('image/png').split(',')[1];
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
   return {normal,faint,count:index,width:w,height:h,bars:barPositions.length};
  },truth);
  const first=path.join(out,'typeset-normal-19.png'),second=path.join(out,'typeset-faint-19.png');
  fs.writeFileSync(first,Buffer.from(pictures.normal,'base64'));
  fs.writeFileSync(second,Buffer.from(pictures.faint,'base64'));
  console.log(JSON.stringify({generated:true,fullNotation:{measures:truth.measures.length,notes:truth.noteCount,rests:truth.restCount,perLine:truth.perLine},drawn:{measures:pictures.count,internalBarlines:pictures.bars},files:[first,second],size:[pictures.width,pictures.height]}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1;});

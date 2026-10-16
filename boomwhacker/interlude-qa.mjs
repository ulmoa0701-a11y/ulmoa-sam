import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright-core';
const root=path.resolve('.');
const out=path.join(root,'boomwhacker','interlude-qa-artifacts');
fs.mkdirSync(out,{recursive:true});
const results=[];
const song={title:'간주 검증곡',timeN:2,timeD:4,bpm:140,
  measures:[[{note:'도',dur:1,lyric:'하'},{note:'솔',dur:1,lyric:'나'}],[{note:'미',dur:1,lyric:'둘'},{note:'솔',dur:1,lyric:'셋'}]]};
let server,browser;
try{
 server=http.createServer((req,res)=>{
  const requested=new URL(req.url,'http://127.0.0.1').pathname;
  let file=path.resolve(root,'.'+decodeURIComponent(requested));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':'application/octet-stream');
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:900},acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const result={mobile};
  try{
   await page.goto('http://127.0.0.1:'+server.address().port+'/boomwhacker/',{waitUntil:'domcontentloaded'});
   await page.evaluate(x=>localStorage.setItem('ulmoaBoomTransfer',JSON.stringify(x)),song);
   await page.reload({waitUntil:'domcontentloaded'});
   if(mobile){await page.locator('#mobileSettingsBtn').click();result.settingsOpen=await page.locator('#introMode').isVisible();}
   result.defaultMode=await page.locator('#introMode').inputValue();
   if(result.defaultMode!=='interlude')throw Error('Default still uses beat-only intro: '+result.defaultMode);
   await page.locator('#introMode').selectOption('interlude');
   const picker=await page.locator('#introMode').evaluate(el=>({width:el.getBoundingClientRect().width,font:Number.parseFloat(getComputedStyle(el).fontSize),display:getComputedStyle(el.parentElement).display}));
   result.introPicker=picker;
   if(mobile&&(picker.width<240||picker.font<12))throw Error('Interlude mode unreadable on mobile '+JSON.stringify(picker));
   if(!mobile&&picker.width<115)throw Error('Interlude mode clipped on desktop '+JSON.stringify(picker));
   const info=await page.evaluate(()=>({mode:introMode,bpm,meter:currentSong.timeN,song:currentSong.title,
     beat:beatMs(),firstNote:firstNoteMs(),view:playView}));
   result.info=info;
   if(info.mode!=='interlude'||info.song!==song.title||info.bpm<35||info.bpm>140||Math.abs(info.beat-60000/info.bpm)>1)throw Error('Incorrect musical interlude selected '+JSON.stringify(info));
   if(mobile)await page.locator('#mobileSettingsClose').click();
   const plan=await page.evaluate(()=>instrumentalPreludePlan());
   result.preludePlan=plan;
   if(plan.bars<2||plan.bars%2||plan.durationMs<6500||plan.durationMs<info.firstNote||plan.firstBallOffsetMs<0||
      plan.firstBallOffsetMs>=plan.durationMs)
     throw Error('Instrumental intro too short for falling-note runway '+JSON.stringify(plan));
   // The intro is a separate full musical phrase, not the opening melody.
   const audioProbe=await page.evaluate(async()=>{
    const plan=instrumentalPreludePlan(),beat=beatMs();
    const ac=new OfflineAudioContext(1,Math.ceil(44100*plan.durationMs/1000)+44100,44100);
    const g=ac.createGain();g.connect(ac.destination);
    const built=scheduleInterludeMusic(ac,g,.05,beat,plan.meter);
    const rendered=await ac.startRendering(),d=rendered.getChannelData(0);
    const power=(a,b)=>{let energy=0;for(let i=Math.floor(a*44100);i<Math.min(d.length,Math.floor(b*44100));i++)energy+=Math.abs(d[i]);return Math.round(energy)};
    const start=.05,last=start+(plan.durationMs-beat)/1000;
    return{bars:built.bars,introStart:power(start+.05,start+.26),lastPreludeBeat:power(last+.04,last+.23)};
   });
   result.audioProbe=audioProbe;
   result.preludeLengthByMeter=await page.evaluate(()=>{
     const priorSong=currentSong,priorBpm=bpm,checks=[];
     for(const meter of [2,3,4]){
       currentSong={...priorSong,timeN:meter};
       for(const tempo of [35,66,100,140]){
         bpm=tempo;
         const p=instrumentalPreludePlan();
         checks.push({meter,tempo,bars:p.bars,ms:Math.round(p.durationMs),offset:Math.round(p.firstBallOffsetMs)});
       }
     }
     currentSong=priorSong;bpm=priorBpm;
     return checks;
   });
   if(result.preludeLengthByMeter.some(p=>p.bars<2||p.bars%2!==0||p.ms<6500||p.offset<0))
     throw Error('Musical intro timing outside target '+JSON.stringify(result.preludeLengthByMeter));
   // Rendering sound energy alone does not prove perceptual clarity; check
   // an actual strong/weak cue waveform across three classroom tempos.
   result.preludePulseProbe=await page.evaluate(async()=>{
     const probes=[];
     for(const tempo of [66,100,140]){
       const beat=60/tempo,start=.08,rate=44100;
       const ac=new OfflineAudioContext(1,Math.ceil(rate*(beat+.32)),rate);
       schedulePreludeBeat(ac,ac.destination,start,true);
       schedulePreludeBeat(ac,ac.destination,start+beat,false);
       const wave=(await ac.startRendering()).getChannelData(0);
       const energy=(a,b)=>{
         let sum=0;
         for(let i=Math.floor(a*rate);i<Math.min(wave.length,Math.floor(b*rate));i++)sum+=Math.abs(wave[i]);
         return Math.round(sum);
       };
       const strong=energy(start+.012,start+.115),weak=energy(start+beat+.012,start+beat+.115);
       probes.push({tempo,strong,weak,ratio:Number((strong/Math.max(1,weak)).toFixed(2))});
     }
     return probes;
   });
   if(result.preludePulseProbe.some(x=>x.strong<55||x.weak<20||x.ratio<1.8))
     throw Error('Instrumental prelude strong/weak pulse is too faint or insufficiently contrasted '+JSON.stringify(result.preludePulseProbe));
   if(audioProbe.introStart<15||audioProbe.lastPreludeBeat<15)
     throw Error('Musical introduction silent or cut off '+JSON.stringify(audioProbe));
   result.musicality=await page.evaluate(async()=>{
     const originalSong=currentSong,oldBpm=bpm;
     currentSong=clone(twinkle);bpm=66;build();
     const harmonies=Array.from({length:8},(_,i)=>chordForMeasure(i).name);
     const leadIn=instrumentalPreludePlan();
     const preludeHarmony=Array.from({length:leadIn.bars},(_,i)=>preludeChordForBar(i,leadIn.bars).name);
     // Regression: the 8-bar Twinkle intro must literally be
     // 도 도 솔 솔 라 라 솔(hold) 파 파 미 미 레 레 도(hold),
     // not an unrelated arpeggio/chord tune.
     const twinklePrelude=instrumentalPreludePlan(),voiceOriginal=scheduleMelodyTone,sequence=[];
     const checkAC=new OfflineAudioContext(1,Math.ceil(44100*(twinklePrelude.durationMs/1000+1)),44100);
     try{
       scheduleMelodyTone=function(...args){
         sequence.push({pitch:args[2],time:args[3],duration:args[6],instrument:args[4]});
         return voiceOriginal(...args);
       };
       scheduleInterludeMusic(checkAC,checkAC.destination,.15,beatMs(),2);
     }finally{scheduleMelodyTone=voiceOriginal}
     const phraseScore=events.filter(e=>e.measure>=currentSong.measures.length-8&&e.note!=='쉼'&&FREQ[e.note]);
     const preludeErrors=sequence.flatMap((note,i)=>{
       const fromScore=phraseScore[i];
       if(!fromScore)return ['Unexpected extra note '+i];
       const expectedAt=.15+(fromScore.start-phraseScore[0].start)/1000;
       return note.pitch!==fromScore.note||Math.abs(note.time-expectedAt)>.0001||
         Math.abs(note.duration-fromScore.dur)>.01||note.instrument!=='piano'?
         ['Note '+i+' does not match exact Small Star score']: [];
     });
     const expectedPitches=['도','도','솔','솔','라','라','솔','파','파','미','미','레','레','도'];
     const exactSequence=sequence.map(n=>n.pitch).join(',')===expectedPitches.join(',');
     const firstPhraseBeats=twinklePrelude.beats;
     const firstScoreNoteAt=.15+twinklePrelude.durationMs/1000;
     const finalPreludeRelease=.15+(phraseScore.at(-1).start-phraseScore[0].start+phraseScore.at(-1).dur)/1000;
     if(!exactSequence||preludeErrors.length||phraseScore.length!==14||firstPhraseBeats!==16||
        twinklePrelude.bars!==8||Math.abs(firstScoreNoteAt-finalPreludeRelease)>.001)
       throw Error('Small Star exact melody/restart timing error '+JSON.stringify({sequence,preludeErrors,twinklePrelude,firstScoreNoteAt,finalPreludeRelease}));
     const sustainedNote=events.find(e=>e.note==='솔'&&e.dur>1.5*beatMs());
     const ac=new OfflineAudioContext(1,Math.ceil(44100*3.5),44100);
     scheduleMelodyTone(ac,ac.destination,'솔',.1,'boom',.65,sustainedNote.dur);
     const wave=(await ac.startRendering()).getChannelData(0);
     const energy=(a,b)=>{let total=0;for(let i=Math.floor(a*44100);i<Math.floor(b*44100);i++)total+=Math.abs(wave[i]);return Math.round(total)};
     const tail=energy(1.08,1.24),start=energy(.16,.31);
     const notes=events.slice(0,7).map(e=>e.note);
     const noteDuration=sustainedNote.dur;
     currentSong=originalSong;bpm=oldBpm;build();
     return{harmonies,preludeHarmony,notes,noteDuration,start,tail,twinklePrelude:{beats:firstPhraseBeats,bars:twinklePrelude.bars,source:twinklePrelude.source,sequence:sequence.map(n=>n.pitch),durationMs:twinklePrelude.durationMs,restartAtMs:Math.round(firstScoreNoteAt*1000),errors:preludeErrors}};
   });
   // Every built-in song must now introduce its real final score phrase,
   // with notated pitches/onsets and a synchronized first downbeat.
   result.allScorePhrasePreludes=await page.evaluate(()=>{
     const originalSong=currentSong,originalBpm=bpm,originalLevel=level;
     const realTone=scheduleMelodyTone,report=[];
     try{
       level=8;
       for(const key of ['plane','butterfly','rabbit','same','bicycle','bear','school-bell','spring-outing','hometown-spring']){
         currentSong=clone(findSample(key));bpm=92;build();
         const plan=instrumentalPreludePlan(),actual=[];
         scheduleMelodyTone=function(...args){
           actual.push({note:args[2],time:args[3],duration:args[6],mode:args[4]});
           return true;
         };
         const ac=new OfflineAudioContext(1,44100,44100),start=.05;
         scheduleInterludeMusic(ac,ac.destination,start,beatMs(),plan.meter);
         const phrase=events.filter(e=>e.measure>=plan.firstMeasure);
         const origin=phrase[0]?.start??firstNoteMs();
         const expected=[];
         for(let rep=0;rep<plan.repeats;rep++)for(const e of phrase){
           if(e.note==='쉼'||!FREQ[e.note])continue;
           expected.push({note:e.note,time:start+rep*plan.phraseDurationMs/1000+(e.start-origin)/1000,
             duration:e.dur});
         }
         const valid=plan.source==='score-ending'&&plan.durationMs>=6500&&plan.bars%2===0
          &&plan.firstBallOffsetMs>=0&&actual.length===expected.length
          &&actual.every((n,i)=>n.note===expected[i]?.note&&Math.abs(n.time-expected[i].time)<.0002
           &&Math.abs(n.duration-expected[i].duration)<.0002&&n.mode==='piano');
         report.push({key,valid,source:plan.source,bars:plan.bars,repeats:plan.repeats,
           notes:actual.length,ms:Math.round(plan.durationMs)});
       }
     }finally{scheduleMelodyTone=realTone;currentSong=originalSong;bpm=originalBpm;level=originalLevel;build()}
     return report;
   });
   if(result.allScorePhrasePreludes.some(x=>!x.valid))
     throw Error('A standard song intro does not follow its actual written ending '+JSON.stringify(result.allScorePhrasePreludes));

   // Regression: a scheduled piano accompaniment note must NOT ring
   // across a written melody note outside its chord. Covers the whole
   // catalogue, both MR patterns and transposed D/F butterfly pieces.
   result.harmonySafety=await page.evaluate(()=>{
     const original={song:currentSong,bpm,level};
     const realBacking=backingNote,realShaker=softShaker;
     const reports=[];let played=0;
     try{
      level=8;softShaker=()=>{};
      for(const sample of SAMPLES){
       currentSong=clone(sample);bpm=100;build();
       let failures=[],scheduled=0;
       for(const style of ['soft','kids']){
        const calls=[];
        backingNote=(ac,dest,hz,when,volume,hold)=>{
         calls.push({hz,when,hold});
         return true;
        };
        const ac=new OfflineAudioContext(1,44100,44100),start=.05;
        const originalStyle=mrStyle;mrStyle=style;
        try{scheduleBuiltinMr(ac,ac.destination,start,0,.7)}
        finally{mrStyle=originalStyle}
        scheduled+=calls.length;
        for(const playedTone of calls){
         for(const e of events){
          if(e.note==='쉼')continue;
          const chord=chordForMeasure(e.measure);
          if(chord.tones.includes(mrBaseNote(e.note)))continue;
          const barNotes=events.filter(n=>n.measure===e.measure);
          const barStart=start+(barNotes[0].start-firstNoteMs())/1000;
          const barEnd=barStart+(barNotes.at(-1).start+barNotes.at(-1).dur-barNotes[0].start)/1000;
          if(playedTone.when<barStart-.0001||playedTone.when>=barEnd)continue;
          const pitchStart=start+(e.start-firstNoteMs())/1000;
          const pitchEnd=pitchStart+e.dur/1000;
          if(playedTone.when<pitchEnd-.001&&playedTone.when+playedTone.hold>pitchStart+.002){
           failures.push({style,measure:e.measure+1,note:e.note,
             chord:chord.name,played:playedTone.when,melody:pitchStart,hold:playedTone.hold});
          }
         }
        }
       }
       reports.push({song:sample.key,scheduled,failures:failures.slice(0,5)});
       played+=scheduled;
      }
     }finally{
      backingNote=realBacking;softShaker=realShaker;
      currentSong=original.song;bpm=original.bpm;level=original.level;build();
     }
     return{played,reports};
   });
   if(result.harmonySafety.played<100||result.harmonySafety.reports.some(x=>x.failures.length))
    throw Error('Wrong-chord accompaniment still overlaps a melody note '+JSON.stringify(result.harmonySafety));
   result.correctedHarmony=await page.evaluate(()=>{
    const old=currentSong,oldBpm=bpm;
    try{
     currentSong=clone(twinkle);bpm=92;build();
     const star=[9,10,13,14].map(i=>({bar:i+1,note:events.find(e=>e.measure===i).note,chord:chordForMeasure(i).name}));
     currentSong=clone(bear);build();
     const bearChord=chordForMeasure(9).name;
     currentSong=clone(butterflyD);build();
     const d={chord:chordForMeasure(1),note:mrBaseNote(events.find(e=>e.measure===1).note)};
     currentSong=clone(butterflyF);build();
     const f={chord:chordForMeasure(1),note:mrBaseNote(events.find(e=>e.measure===1).note)};
     return{star,bearChord,d:{name:d.chord.name,notes:d.chord.tones,pitch:d.note},f:{name:f.chord.name,notes:f.chord.tones,pitch:f.note}};
    }finally{currentSong=old;bpm=oldBpm;build()}
   });
   if(result.correctedHarmony.star.map(x=>x.chord).join(',')!=='F,C,F,C'||
      result.correctedHarmony.bearChord!=='G'||
      !result.correctedHarmony.d.notes.includes(result.correctedHarmony.d.pitch)||
      !result.correctedHarmony.f.notes.includes(result.correctedHarmony.f.pitch))
    throw Error('Known harmonic dissonance was not corrected '+JSON.stringify(result.correctedHarmony));

   result.classroom=await page.evaluate(async()=>{
     const saved={song:currentSong,level,custom:[...customNotes],bpm,section:practiceSection,length:introLength,loaded:loadedFromTransfer,
        playing,sound,mixMode,melodyMode,elapsed,ctx:audioCtx};
     const report=[];
     let ownedAudio=false;
     try{
      loadedFromTransfer=false;
      if(!audioCtx){audioCtx=new AudioContext();ownedAudio=true}
      const originalTone=scheduleMelodyTone;
      for(const key of ['plane','twinkle','butterfly','moa-signal','moa-space','moa-party','moa-breeze','butterfly-d','hometown-spring']){
       currentSong=clone(findSample(key));practiceSection='all';refreshPracticeSections();bpm=92;
       let pitchBaseline=null,timingBaseline=null,harmonyBaseline=null,beatsBaseline=null;
       const expected=currentSong.measures.flat().map(e=>({note:canonical(e.note),dur:e.dur}));
       for(const n of [3,5,8]){
        level=n;build();
        const pitch=events.map(e=>e.note).join(',');
        const timing=events.map(e=>e.start+':'+e.dur).join(',');
        const harmony=playbackMeasures.map((_,i)=>chordForMeasure(i).name).join(',');
        const expectedPitches=expected.map(e=>e.note).join(',');
        const filtered=events.filter(e=>e.active);
        const valid=pitch===expectedPitches&&(pitchBaseline===null||pitchBaseline===pitch)
          &&(timingBaseline===null||timingBaseline===timing)
          &&(harmonyBaseline===null||harmonyBaseline===harmony)
          &&(beatsBaseline===null||beatsBaseline===firstNoteMs())
          &&arrangedNotes===0&&filtered.every(e=>ALLOWED[n].has(e.note))
          &&events.every(e=>e.note==='쉼'||e.active===ALLOWED[n].has(e.note));
        // Full original melody must actually be scheduled on the WebAudio
        // timeline, irrespective of the difficulty's active falling notes.
        const fired=[];
        try{
         scheduleMelodyTone=function(_ac,_dest,note,when,_mode,_volume,duration){
          fired.push({note,when,duration});return true;
         };
         playing=true;sound=true;mixMode='both';melodyMode='piano';elapsed=firstNoteMs()-.5;
         syncLiveSongMelody();
         songAudioStartAt=audioCtx.currentTime-10000;
         queueUpcomingMelody();
         stopSongMelody();
        }finally{scheduleMelodyTone=originalTone;playing=false}
        const sounded=expected.filter(e=>e.note!=='쉼'&&!!FREQ[e.note]);
        const playbackFull=fired.map(e=>e.note).join(',')===sounded.map(e=>e.note).join(',')
          &&fired.length===sounded.length;
        report.push({key,level:n,valid:valid&&playbackFull,total:events.length,
          sounded:fired.length,falling:filtered.length,hidden:events.filter(e=>e.note!=='쉼'&&!e.active).length,
          first:events[0]?.note,firstBeat:firstNoteMs(),playbackFull,unmodified:valid});
        if(pitchBaseline===null){pitchBaseline=pitch;timingBaseline=timing;harmonyBaseline=harmony;beatsBaseline=firstNoteMs()}
       }
       if(currentSong.measures.length>4){
        level=3;practiceSection='4';build();
        const measureSource=currentSong.measures.slice(4,8).flat().map(e=>canonical(e.note)).join(',');
        const chosen=events.map(e=>e.note).join(',');
        report.push({key,exercise:true,valid:playbackMeasures.length===Math.min(4,currentSong.measures.length-4)
          &&scoreStartBar===4&&events.every(e=>e.measure>=0&&e.measure<4)
          &&measureSource===chosen&&arrangedNotes===0});
       }
      }
      // Custom 1/2/8-note choices are just visual masks: the complete melody
      // must still schedule every supported note, and all MR chords match.
      for(const key of ['plane','twinkle','butterfly-d']){
       currentSong=clone(findSample(key));practiceSection='all';bpm=92;level=8;build();
       const baseline={
        notes:events.map(e=>[e.note,e.start,e.dur]),
        chords:playbackMeasures.map((_,i)=>chordForMeasure(i).name),
        downbeat:firstNoteMs()
       };
       for(const names of [['레','솔'],['높은도'],[...ORDER]]){
        customNotes=new Set(names);level='custom';build();
        const tracks=events.map(e=>[e.note,e.start,e.dur]);
        const chords=playbackMeasures.map((_,i)=>chordForMeasure(i).name);
        const fired=[];
        try{
         scheduleMelodyTone=function(_ac,_dest,note,when,_mode,_volume,duration){
          fired.push({note,when,duration});return true;
         };
         playing=true;sound=true;mixMode='both';melodyMode='piano';elapsed=firstNoteMs()-.5;
         syncLiveSongMelody();songAudioStartAt=audioCtx.currentTime-10000;queueUpcomingMelody();stopSongMelody();
        }finally{scheduleMelodyTone=originalTone;playing=false}
        const played=events.filter(e=>e.note!=='쉼'&&FREQ[e.note]).map(e=>e.note);
        report.push({key,custom:names.join(','),
          valid:JSON.stringify(baseline.notes)===JSON.stringify(tracks)
            &&JSON.stringify(chords)===JSON.stringify(baseline.chords)
            &&baseline.downbeat===firstNoteMs()
            &&events.every(e=>e.note==='쉼'||e.active===names.includes(e.note))
            &&fired.map(x=>x.note).join(',')===played.join(',')
            &&arrangedNotes===0,
          falling:events.filter(e=>e.active).length,sounding:fired.length});
       }
      }
      // A first scored pitch with no corresponding ball must not move the
      // song's MR clock or alter the timing of its later selected balls.
      currentSong=clone(findSample('twinkle'));practiceSection='all';level=3;introLength='full';bpm=92;build();
      const full=instrumentalPreludePlan();
      introLength='short';
      const short=instrumentalPreludePlan();
      const rate=22050,ac=new OfflineAudioContext(1,Math.ceil(rate*(short.durationMs/1000+.5)),rate);
      scheduleInterludeMusic(ac,ac.destination,.01,beatMs(),short.meter);
      const wave=(await ac.startRendering()).getChannelData(0);
      const energy=wave.reduce((sum,x)=>sum+Math.abs(x),0);
      report.push({key:'twinkle',intro:'short',valid:short.durationMs<full.durationMs
        &&short.durationMs>firstNoteMs()&&short.firstBallOffsetMs>=0&&energy>20
        &&firstNoteMs()===events[0].start,
        shortBeats:short.beats,fullBeats:full.beats,energy:Math.round(energy)});
     }finally{
      stopSongMelody();
      currentSong=saved.song;level=saved.level;customNotes=new Set(saved.custom);bpm=saved.bpm;practiceSection=saved.section;introLength=saved.length;loadedFromTransfer=saved.loaded;
      playing=saved.playing;sound=saved.sound;mixMode=saved.mixMode;melodyMode=saved.melodyMode;elapsed=saved.elapsed;
      if(ownedAudio){try{await audioCtx.close()}catch(e){}audioCtx=saved.ctx}
      build();refreshPracticeSections();
     }
     return report;
   });
   if(result.classroom.some(x=>!x.valid))
    throw Error('Full original melody, 3/5-note falling cue isolation or 4-bar practice failed '+JSON.stringify(result.classroom));

   const mu=result.musicality;
   if(mu.notes.join(',')!=='도,도,솔,솔,라,라,솔'||
      mu.harmonies.join(',')!=='C,C,F,C,F,C,G,C'||
      mu.preludeHarmony.at(0)!=='C'||mu.preludeHarmony.at(-1)!=='G'||
      mu.noteDuration<1500||mu.start<15||mu.tail<6)
     throw Error('Real musical rhythm / sustained sol / cadence failed '+JSON.stringify(mu));
   await page.evaluate(()=>{
     window.__musicClock=[];
     const m=scheduleMelodyTone, mr=scheduleMrTrack;
     scheduleMelodyTone=function(...args){window.__musicClock.push({type:'melody',pitch:args[2],when:args[3],noteDur:args[6]});return m(...args)};
     scheduleMrTrack=function(...args){window.__musicClock.push({type:'mr',when:args[2]});return mr(...args)};
   });
   await page.locator(mobile?'#playBtn':'#startBtn').click();
   result.start=await page.evaluate(()=>({
      active:introActive,beats:introBeats,preview:introPreviewBeats,count:introCountBeats,
      heading:document.querySelector('#introHeading').innerText,first:document.querySelector('#introPulse').innerText,
      scheduled:!!mrSource,firstBallOffsetMs:instrumentalPreludePlan().firstBallOffsetMs}));
   if(!result.start.active||result.start.count!==0||result.start.preview!==plan.beats||result.start.beats!==plan.beats||
      result.start.first!=='🎶'||!result.start.scheduled)
     throw Error('Countdown and future MR schedule wrong '+JSON.stringify(result.start));
   result.beforeBall=await page.evaluate(()=>{
     const p=instrumentalPreludePlan(),offset=Math.max(0,p.firstBallOffsetMs-80);
     const originalAudioStart=introAudioStartAt;introAudioStartAt=audioCtx.currentTime-offset/1000;introFrame(performance.now());introAudioStartAt=originalAudioStart;
     return{introActive,playing,balls:document.querySelectorAll('.fall').length,elapsed};
   });
   if(!result.beforeBall.introActive||result.beforeBall.playing||result.beforeBall.balls!==0)
     throw Error('Balls appeared BEFORE the prelude runway '+JSON.stringify(result.beforeBall));
   const duringAndOverlay=await page.evaluate(()=>{
     const p=instrumentalPreludePlan(),offset=p.firstBallOffsetMs+Math.min(750,firstNoteMs()/2);
     const originalAudioStart=introAudioStartAt;
     introAudioStartAt=audioCtx.currentTime-offset/1000;
     introFrame(performance.now());
     const el=document.querySelector('#introOverlay'),css=getComputedStyle(el),card=el.querySelector('.introCard');
     const during={introActive,playing,balls:document.querySelectorAll('.fall').length,elapsed,pulse:document.querySelector('#introPulse').innerText};
     const overlay={compact:el.classList.contains('preludePlaying'),background:css.backgroundColor,blur:css.backdropFilter,
       cardH:card.getBoundingClientRect().height,stageH:document.querySelector('#stage').getBoundingClientRect().height};
     introAudioStartAt=originalAudioStart;
     return{during,overlay};
   });
   result.duringBall=duringAndOverlay.during;
   result.overlay=duringAndOverlay.overlay;
   if(!result.duringBall.introActive||result.duringBall.playing||result.duringBall.balls<1||
      result.duringBall.elapsed<=0||result.duringBall.pulse!=='🎶')
     throw Error('First ball must descend WHILE instrumental intro plays '+JSON.stringify(result.duringBall));
   if(!result.overlay.compact||result.overlay.blur!=='none'||result.overlay.cardH>result.overlay.stageH/2)
     throw Error('Musical intro overlay still obscures falling balls '+JSON.stringify(result.overlay));
   await page.waitForFunction(()=>!introActive&&playing,null,{timeout:16000});
   result.handoff=await page.evaluate(()=>({introActive,playing,mrScheduled:!!mrSource,mix:mixMode,elapsed,firstNote:firstNoteMs(),leadGain:!!leadInGain}));
   result.audioClock=await page.evaluate(()=>window.__musicClock);
   const scheduledMr=result.audioClock.find(x=>x.type==='mr');
   // The prelude now legitimately contains real score melody notes.
   // Compare the first MAIN-SONG note at/after the MR downbeat, not the
   // first note of the instrumental introduction.
   const scheduledNote=result.audioClock.find(x=>x.type==='melody'&&scheduledMr&&x.when>=scheduledMr.when-.003);
   if(!scheduledNote||!scheduledMr||scheduledNote.pitch!=='도'||
      Math.abs(scheduledNote.when-scheduledMr.when)>.003||
      Math.abs(scheduledNote.noteDur-result.info.beat)>5)
     throw Error('First melody note was skipped or starts off-beat from MR '+JSON.stringify(result.audioClock));

   if(result.handoff.introActive||!result.handoff.playing||!result.handoff.mrScheduled||
      result.handoff.mix!=='both'||Math.abs(result.handoff.elapsed-result.handoff.firstNote)>250||
      result.handoff.leadGain)
     throw Error('MR must start on first ball downbeat with NO extra silent delay '+JSON.stringify(result.handoff));
   await page.locator('#resetBtn').click();
   result.reset=await page.evaluate(()=>({playing,introActive,leadGain:!!leadInGain}));
   if(result.reset.playing||result.reset.introActive||result.reset.leadGain)throw Error('Lead was not safely cancelled');
   // Confirm the instrumental and beat-only cues are real sounds (no voice).
   result.beatProbe=await page.evaluate(async()=>{
     const beat=beatMs(),plan=instrumentalPreludePlan();
     const ac=new OfflineAudioContext(1,Math.ceil(44100*plan.durationMs/1000)+44100,44100);
     scheduleRhythmGuide(ac,ac.destination,.07,plan.beats,beat,plan.meter);
     const samples=(await ac.startRendering()).getChannelData(0);
     const energy=(a,b)=>{let t=0;for(let i=Math.floor(a*44100);i<Math.min(samples.length,Math.floor(b*44100));i++)t+=Math.abs(samples[i]);return Math.round(t)};
     return{strong:energy(.08,.25),weak:energy(.07+beat/1000+.01,.07+beat/1000+.22)};
   });
   if(result.beatProbe.strong<=20||result.beatProbe.weak<=15)
     throw Error('Strong/weak beat guide produces no audible sound '+JSON.stringify(result.beatProbe));
   for(const mode of ['music']){
     if(mobile)await page.locator('#mobileSettingsBtn').click();
     await page.locator('#introMode').selectOption(mode);
     if(mobile)await page.locator('#mobileSettingsClose').click();
     await page.locator(mobile?'#playBtn':'#startBtn').click();
     const started=await page.evaluate(()=>({count:introCountBeats,preview:introPreviewBeats,beats:introBeats,
       expected:instrumentalPreludePlan().beats,pulse:document.querySelector('#introPulse').innerText,
       state:$('#introHelp').textContent}));
     if(started.count!==0||started.preview!==started.expected||started.beats!==started.expected)
       throw Error('Mode not synchronized to musical plan '+JSON.stringify({mode,started}));
     if(mode==='music'&&started.pulse!=='쿵')
       throw Error('Rhythm mode must show strong first beat '+JSON.stringify(started));
     await page.locator('#resetBtn').click();
   }
   if(mobile)await page.locator('#mobileSettingsBtn').click();
   await page.locator('#introMode').selectOption('interlude');
   if(mobile)await page.locator('#mobileSettingsClose').click();
   await page.locator('#playViewSelect').selectOption('score');
   await page.locator(mobile?'#playBtn':'#startBtn').click();
   await page.waitForFunction(()=>!introActive&&playing,null,{timeout:16000});
   result.scoreStart=await page.evaluate(()=>({view:playView,introActive,playing,leadGain:!!leadInGain,elapsed,first:scoreStartMs()}));
   if(result.scoreStart.introActive||!result.scoreStart.playing||result.scoreStart.leadGain||result.scoreStart.elapsed<result.scoreStart.first-100)throw Error('Score mode first-note alignment wrong');
   await page.locator('#resetBtn').click();
   result.ok=errors.length===0;
   result.errors=errors;
  }catch(err){result.ok=false;result.error=String(err);result.errors=errors}
  results.push(result);console.log('BOOM_INTERLUDE_QA='+JSON.stringify(result));
  await page.screenshot({path:path.join(out,'interlude-'+(mobile?'mobile':'desktop')+'.png'),fullPage:true}).catch(()=>{});
  await context.close();
 }
}finally{await browser?.close();if(server)await new Promise(done=>server.close(done))}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
if(results.length!==2||results.some(x=>!x.ok))process.exitCode=1;

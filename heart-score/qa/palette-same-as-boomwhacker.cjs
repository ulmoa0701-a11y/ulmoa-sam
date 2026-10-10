/* Check actual studio colors against the Boomwhacker instrument UI.
 * Includes all written-pitch accidentals and octave-equivalent labels.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const boom=fs.readFileSync(path.join(root,'boomwhacker/index.html'),'utf8');
const heart=fs.readFileSync(path.join(root,'heart-score/index.html'),'utf8');
function objSlice(source, marker, stop){
 const from=source.indexOf(marker);
 assert(from>=0,marker+' is missing');
 const to=source.indexOf(stop,from);
 assert(to>=0,stop+' is missing');
 return source.slice(from,to);
}
const heartInfo=objSlice(heart,'const NOTE_INFO={','\nconst NOTE_OPTIONS=');
const boomInfo=objSlice(boom,'const COLORS={',';\nconst TEXT=');
const notes=['도','레','미','파','솔','라','시'];
const boomMap=Object.fromEntries([...boomInfo.matchAll(/(?:'([^']+)'|([가-힣]+)):'(#[a-fA-F0-9]{6})'/g)].map(m=>[m[1]||m[2],m[3].toUpperCase()]));
const heartMap=Object.fromEntries([...heartInfo.matchAll(/'([^']+)':\{c:'(#[a-fA-F0-9]{6})'/g)].map(m=>[m[1],m[2].toUpperCase()]));
for(const note of notes)assert.equal(heartMap[note],boomMap[note],'Pitch color mismatch: '+note);
assert.equal(boomMap['높은도'],boomMap['도']);
for(const [note,alias] of [['도#','도'],['레♭','레'],['레#','레'],['미♭','미'],['파#','파'],['솔♭','솔'],['솔#','솔'],['라♭','라'],['라#','라'],['시♭','시']]){
 // Heart Score uses plainNoteOf to select the written base color, not enharmonic color.
 assert.equal(heartMap[note],boomMap[alias],'Altered written pitch color mismatch: '+note);
}
assert.match(heart,/function colorOf\(note\)\{const base=plainNoteOf\(note\)/);
assert.match(heart,/function plainNoteOf\(note\)\{return baseNoteOf\(note\)\.replace\('#',''\)\.replace\('♭',''\)/);
assert.match(heart,/colorOf\(s\.event\.note\)/,'Rendered hearts must use shared pitch colors');
console.log(JSON.stringify({ok:true,notes:notes.map(note=>({note,color:heartMap[note]})),accidentalsChecked:10,highOctaves:'same-pitch'}));

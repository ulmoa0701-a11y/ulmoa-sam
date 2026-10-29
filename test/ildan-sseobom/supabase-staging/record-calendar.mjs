// Pure helpers for writing-date calendars. No network or private-data transmission.
const pad=n=>String(n).padStart(2,'0');
export function writtenDay(record){
 const eventDate=record?.entry?.date;
 if(typeof eventDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(eventDate)){
  const [year,month,day]=eventDate.split('-').map(Number);
  const check=new Date(year,month-1,day,12);
  if(check.getFullYear()===year&&check.getMonth()===month-1&&check.getDate()===day)
   return eventDate;
 }
 // Legacy entries with no valid explicit date retain the creation-date fallback.
 const d=new Date(record?.createdAt||'');
 if(Number.isNaN(d.getTime()))return null;
 return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
export function recordVolume(record){
 const e=record?.entry||{};
 const textKeys=['note','title','event','thought','next','observation','message','mood','energy','body','action','response','impact','context','origin','place','signals','after','experience','experienceImpact','childWords','abcBefore','abcBehavior','abcAfter'];
 const characters=textKeys.reduce((n,k)=>n+(typeof e[k]==='string'?[...e[k]].filter(c=>!/\s/.test(c)).length:0),0);
 return {characters,photos:Array.isArray(e.photos)?e.photos.length:0,drawings:e.sketch?1:0};
}
export function calendarIndex(records){
 const days=new Map();
 for(const record of records){
  const date=writtenDay(record);
  if(!date)continue;
  if(!days.has(date))days.set(date,{date,count:0,characters:0,photos:0,drawings:0,records:[]});
  const item=days.get(date),volume=recordVolume(record);
  item.count++;item.characters+=volume.characters;item.photos+=volume.photos;item.drawings+=volume.drawings;
  item.records.push(record);
 }
 return days;
}
export function monthVolume(days,year,month){ // month is 0-based
 const prefix=`${year}-${pad(month+1)}-`;
 const totals={days:0,count:0,characters:0,photos:0,drawings:0};
 for(const [date,day] of days)if(date.startsWith(prefix)){
  totals.days++;for(const k of ['count','characters','photos','drawings'])totals[k]+=day[k];
 }
 return totals;
}

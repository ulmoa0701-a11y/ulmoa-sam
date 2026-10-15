const version=owner.data.records[0].updatedAt;
check(version&&owner.data.records[0].photoPaths?.length===1,'edit metadata or original photo missing');
const changed={...entry,note:'수정된 가상 연습 기록'};
const updated=await request('practice-update',{recordId,expectedUpdatedAt:version,entry:changed,share:true},studentToken);
check(updated.status===200&&updated.data.record?.id===recordId,'EDIT_FAIL '+JSON.stringify(updated));
const stale=await request('practice-update',{recordId,expectedUpdatedAt:version,entry,share:true},studentToken);
check(stale.status===409,'stale editing was not rejected');
const unauthorized=await request('practice-update',{recordId,expectedUpdatedAt:updated.data.record.updatedAt,entry,share:true},therapistToken);
check(unauthorized.status===403,'therapist was allowed to change a student record');
const refreshed=await request('practice-records',null,therapistToken,'GET');
check(refreshed.status===200&&refreshed.data.records?.length===1&&refreshed.data.records[0].entry.note===changed.note,
 'therapist must see revised text in same record');
const removePhoto=await request('practice-update',{recordId,expectedUpdatedAt:updated.data.record.updatedAt,
 entry:{date:entry.date,note:'수정 후 사진을 제거한 기록',sketch:entry.sketch},share:true},studentToken);
check(removePhoto.status===200&&!removePhoto.data.photoCleanupPending,'remove attached photo failed '+JSON.stringify(removePhoto));
const finalOwner=await request('practice-records',null,studentToken,'GET');
check(finalOwner.status===200&&finalOwner.data.records?.length===1&&!finalOwner.data.records[0].photoPaths?.length,
 'photo still attached after editing');

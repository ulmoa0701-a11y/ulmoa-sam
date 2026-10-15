const guardianOwn=await request('practice-records',null,guardianToken,'GET');
const revision=await request('practice-update',{recordId:parentSaved.data.record.id,
 expectedUpdatedAt:guardianOwn.data.records[0].updatedAt,
 entry:{...guardianEntry,observation:'수정된 보호자 가상 관찰'},share:false},guardianToken);
check(revision.status===200,'guardian revision failed '+JSON.stringify(revision));
const hiddenByEdit=await request('practice-records',null,therapistToken,'GET');
check(hiddenByEdit.status===200&&!hiddenByEdit.data.records?.length,'unshared edited guardian entry exposed');
const parentShared=await request('practice-share',{recordId:parentSaved.data.record.id},guardianToken);
check(parentShared.status===200,'guardian reshare after edit failed');
const parentRefreshed=await request('practice-records',null,therapistToken,'GET');
check(parentRefreshed.data.records?.[0]?.entry.observation==='수정된 보호자 가상 관찰',
 'therapist sees stale guardian note after reshare');

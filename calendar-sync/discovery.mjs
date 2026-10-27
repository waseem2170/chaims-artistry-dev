// Small pages keep each scheduled invocation bounded. A saved cursor cycles through
// upcoming bookings, so bookings beyond the first page are not starved.
export const PAGE_SIZE=20;
export function bookingQuery(now,cursor){
 const query={from:[{collectionId:'bookings'}],where:{fieldFilter:{field:{fieldPath:'startAt'},op:'GREATER_THAN_OR_EQUAL',value:{timestampValue:new Date(now-24*3600000).toISOString()}}},orderBy:[{field:{fieldPath:'startAt'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:PAGE_SIZE};
 if(cursor?.startAt&&cursor?.name)query.startAt={values:[{timestampValue:cursor.startAt},{referenceValue:cursor.name}],before:false};
 return query;
}
export function pendingQuery(){return {from:[{collectionId:'calendarSyncOutbox'}],where:{fieldFilter:{field:{fieldPath:'state'},op:'EQUAL',value:{stringValue:'pending'}}},limit:PAGE_SIZE};}
export function nextCursor(documents){const last=documents.at(-1);return documents.length===PAGE_SIZE?{startAt:last.fields.startAt.timestampValue,name:last.name}:{startAt:'',name:''};}

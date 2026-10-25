export const bucket=b=>b.status==='confirmed'?'approved':b.adminReviewedAt?'queued':'new';
export function bookingPage(bookings,tab,search='',page=1,formatDate=String){
 const q=search.trim().toLowerCase();
 const matched=bookings.filter(b=>bucket(b)===tab).filter(b=>(JSON.stringify(b)+' '+formatDate(b.start)+' '+(b.reservationFee/100)).toLowerCase().includes(q));
 const pages=Math.max(1,Math.ceil(matched.length/10));page=Math.max(1,Math.min(page,pages));
 return {page,pages,total:matched.length,visible:matched.slice((page-1)*10,page*10)};
}

export function sortBookings(bookings,order='newest'){
 const timestamp=value=>typeof value?.toMillis==='function'?value.toMillis():value?.seconds?value.seconds*1000:Date.parse(value)||0;
 return [...bookings].sort((a,b)=>{const result=(order==='date'||order==='date-desc')?(timestamp(a.start)-timestamp(b.start))*(order==='date-desc'?-1:1):(timestamp(a.createdAt)-timestamp(b.createdAt))*(order==='oldest'?1:-1);return result||String(a.id).localeCompare(String(b.id));});
}

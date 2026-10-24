export const ADMIN_SESSION_MS=30*60*1000;
export const sessionValid=(authTime,now=Date.now())=>Number.isFinite(Date.parse(authTime))&&now>=Date.parse(authTime)&&now-Date.parse(authTime)<ADMIN_SESSION_MS;
export async function requireFreshAdmin(user){if(!user||!sessionValid((await user.getIdTokenResult()).authTime))throw Error('Your 30-minute admin session has expired. Please sign in again.');}

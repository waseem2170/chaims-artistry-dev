// Validate format only; this does not prove that a phone number is reachable.
export function normalisePhone(value,country='BE'){
 const raw=String(value).trim();
 if(!/^[+\d\s().-]+$/.test(raw))throw Error('Enter a valid phone number, including its country code.');
 let phone=raw.replace(/[\s().-]/g,'').replace(/^00/,'+');
 if(!phone.startsWith('+')){
  if(!['BE','NL'].includes(country)||!phone.startsWith('0'))throw Error('Use a local number starting with 0, or include the country code, such as +32.');
  phone=(country==='NL'?'+31':'+32')+phone.slice(1);
 }
 if(!/^\+[1-9]\d{7,14}$/.test(phone)||phone.startsWith('+32')&&!/^\+32[1-9]\d{7,8}$/.test(phone)||phone.startsWith('+31')&&!/^\+31[1-9]\d{8}$/.test(phone))throw Error('Check your phone number. For example: +32 470 12 34 56.');
 return phone;
}
export function formatAddress({street,postcode,city,country}){
 street=String(street).trim();postcode=String(postcode).trim().toUpperCase();city=String(city).trim();
 if(!['BE','NL'].includes(country))throw Error('Choose Belgium or Netherlands.');
 if(!street||street.length>180||!/[0-9]/.test(street))throw Error('Enter your street and house number.');
 if(!city||city.length>100)throw Error('Enter your city.');
 if(country==='BE'?!/^[1-9]\d{3}$/.test(postcode):! /^[1-9]\d{3}\s?[A-Z]{2}$/.test(postcode))throw Error(country==='BE'?'Enter a four-digit Belgian postcode.':'Enter a Dutch postcode, such as 1012 AB.');
 if(country==='NL')postcode=postcode.replace(/\s/g,'').replace(/^(\d{4})/,'$1 ');
 return `${street}\n${postcode} ${city}\n${country==='BE'?'Belgium':'Netherlands'}`;
}

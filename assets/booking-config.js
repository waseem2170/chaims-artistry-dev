// Public Firebase web configuration. Backend credentials stay in Secret Manager.
export const bookingConfig = {
 firebase: {
  apiKey: 'AIzaSyA4CkcrzVjaDlDEIEOQbRJsJIzcBWK9ou4',
  authDomain: 'chaims-artistry.firebaseapp.com',
  projectId: 'chaims-artistry',
  storageBucket: 'chaims-artistry.firebasestorage.app',
  messagingSenderId: '431354753019',
  appId: '1:431354753019:web:46d39bca1fd16c11ce255e',
  measurementId: 'G-TQHTR2404B'
 },
 emailEndpoint: 'https://chaims-booking-email.waseem-malik1999.workers.dev',
 recaptchaEnterpriseSiteKey: '6LcELv0tAAAAADGm4iPJjDzOlnjFv01HKZ5ftLUL',
 googleCalendarEnabled: false, // Enable after the dedicated calendar connection is verified.
 region: 'europe-west1'
};

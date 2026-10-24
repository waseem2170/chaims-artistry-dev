import {test} from 'node:test';import assert from 'node:assert/strict';import {appendInspiration} from './assets/inspiration.mjs';
const a={name:'first.png',size:20,type:'image/png',lastModified:1},b={...a,name:'second.png'},c={...a,name:'third.png'};
test('separate selections append and duplicates do not consume a slot',()=>{assert.deepEqual(appendInspiration([a],[b]),[a,b]);assert.deepEqual(appendInspiration([a],[a]),[a]);});
test('invalid or third file does not mutate previous selection',()=>{const previous=[a,b];assert.throws(()=>appendInspiration(previous,[c]));assert.deepEqual(previous,[a,b]);assert.throws(()=>appendInspiration([a],[{...b,size:4*1024*1024}]));});

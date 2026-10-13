import assert from 'node:assert/strict';
import test from 'node:test';
import { createSyncScheduler } from './sync-scheduler';
import { applyDuelDelta, checkInPatch, proofPhotos, proofReference, type DuelSnapshot } from './duel-data';
import { duelCacheKey } from './duel-cache';
import { saveDuelCheckIns, syncDuelData } from './duel-sync';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckIn } from './types';

const checkIn: CheckIn = { id:'check:1', habitId:'habit', playerId:'maciek', date:'2026-10-13', pointsEarned:20, completedAt:'2026-10-13T12:00:00Z', proofCount:1, proofVersion:'version' };
const snapshot: DuelSnapshot = { cursor:'0', data:{ habits:[],checkIns:[checkIn],stakes:[],reactions:[],restDays:[] } };
const flush = async () => { for(let i=0;i<10;i++) await Promise.resolve(); };
function clock() {
  const timers = new Map<number,{callback:()=>void;delay:number}>(); let id=0;
  return {
    timers,
    schedule(callback:()=>void,delay:number) { timers.set(++id,{callback,delay}); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel(timer:ReturnType<typeof setTimeout>) { timers.delete(timer as unknown as number); },
    fire() { const [key,timer]=timers.entries().next().value!; timers.delete(key); timer.callback(); return timer.delay; },
    delay() { return timers.values().next().value?.delay; },
  };
}
test('twenty events share one read, and changes during a read share one follow-up', async()=> {
  const timer=clock(); let calls=0; const finish:(()=>void)[]=[];
  const scheduler=createSyncScheduler({read:()=> {calls++;return new Promise<void>(resolve=>finish.push(resolve));},active:()=>true,subscribed:()=>true,failed:()=>{},schedule:timer.schedule,cancel:timer.cancel});
  for(let i=0;i<20;i++) scheduler.request();
  assert.equal(timer.timers.size,1); timer.fire(); await flush(); assert.equal(calls,1);
  for(let i=0;i<20;i++) scheduler.request();
  assert.equal(calls,1); finish.shift()!(); await flush(); timer.fire(); await flush(); assert.equal(calls,2);
  finish.shift()!(); await flush(); scheduler.stop(); assert.equal(timer.timers.size,0);
});
test('hidden and offline sessions perform no polling and failed reads back off',async()=> {
  const timer=clock(); let active=false;let fail=true;let calls=0;
  const scheduler=createSyncScheduler({read:async()=>{calls++;if(fail)throw Error('offline');},active:()=>active,subscribed:()=>false,failed:()=>{},schedule:timer.schedule,cancel:timer.cancel});
  scheduler.request(); if(timer.timers.size)timer.fire(); await flush(); assert.equal(calls,0);
  active=true; scheduler.request(); timer.fire(); await flush(); assert.equal(timer.delay(),60000);
  scheduler.request(); assert.equal(timer.delay(),60000);
  timer.fire(); await flush(); assert.equal(timer.delay(),120000);
  fail=false; timer.fire(); await flush(); assert.equal(timer.delay(),30000);
  active=false;scheduler.pause();assert.equal(timer.timers.size,0);scheduler.stop();
});
test('metadata delta preserves unrelated history, applies tombstones and resets old cursors',()=> {
  const updated={...checkIn,note:'Changed'};
  const next=applyDuelDelta(snapshot,{cursor:'1',snapshot:null,changes:[{table:'duel_check_ins',id:checkIn.id,deleted:false,data:updated}]});
  assert.equal(next.data.checkIns.length,1);assert.equal(next.data.checkIns[0].note,'Changed');assert.equal(snapshot.data.checkIns[0].note,undefined);
  assert.equal(applyDuelDelta(next,{cursor:'2',snapshot:null,changes:[{table:'duel_check_ins',id:checkIn.id,deleted:true,data:null}]}).data.checkIns.length,0);
  assert.equal(applyDuelDelta(next,{cursor:'0',snapshot:snapshot.data,changes:[]}).cursor,'0');
});
test('proof references preserve counts and prevent placeholders from overwriting original photos',()=> {
  const photos=proofPhotos(checkIn);assert.equal(photos.length,1);assert.equal(proofReference(photos[0])?.id,checkIn.id);
  assert.equal(checkInPatch(checkIn).proofUrls,undefined);assert.equal(checkInPatch(checkIn).proofCount,undefined);
  assert.throws(()=>checkInPatch({...checkIn,proofUrls:photos}));
  assert.deepEqual(proofPhotos({...checkIn,proofUrls:['https://example.test/photo.jpg']}),['https://example.test/photo.jpg']);
});
test('a repeated reopen sends the cached cursor and duplicate rebalanced writes send one patch',async()=> {
  const requests:{name:string;args:Record<string,unknown>}[]=[];
  const client={rpc:async(name:string,args:Record<string,unknown>)=>{requests.push({name,args});return {data:name==='sync_duel'?{cursor:'0',snapshot:null,changes:[]}:null,error:null};}} as unknown as SupabaseClient;
  assert.deepEqual(await syncDuelData(client,'duel',snapshot),snapshot);assert.equal(requests[0].args.p_after,'0');
  await saveDuelCheckIns(client,'duel',[checkIn,{...checkIn,note:'latest'}]);
  const patches=requests[1].args.p_check_ins as CheckIn[];assert.equal(patches.length,1);assert.equal(patches[0].note,'latest');assert.equal(patches[0].proofCount,undefined);
  assert.notEqual(duelCacheKey('project','a','duel'),duelCacheKey('project','b','duel'));
  assert.notEqual(duelCacheKey('project','a','duel'),duelCacheKey('other','a','duel'));
});

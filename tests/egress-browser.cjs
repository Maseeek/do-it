const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=> {
 const {createEgressFixture}=await import('../supabase/egress-fixture.mjs');
 const {db,owner,guest,duel}=await createEgressFixture();
 const date=new Date().toISOString().slice(0,10);
 const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=';
 const habit={id:'habit-1',playerId:'maciek',title:'Clean space',description:'',category:'environment',points:20,iconName:'Sparkles',order:0,isActive:true,requiresProof:true};
 const partnerHabit={...habit,id:'habit-2',playerId:'myrna'};
 const running={...habit,id:'habit-3',title:'Running',category:'cardio',requiresProof:false,iconName:'Activity',order:1};
 await db.query('update public.duel_habits set data=$1 where id=$2',[habit,habit.id]);
 for(const h of [partnerHabit,running]) await db.query('insert into public.duel_habits values ($1,$2,$3,$4)',[duel,h.id,h.playerId,h]);
 const original={id:'check-1',habitId:habit.id,playerId:'maciek',date,pointsEarned:20,completedAt:date+'T12:00:00Z',proofUrl:pixel,proofUrls:[pixel]};
 await db.query('update public.duel_check_ins set data=$1 where id=$2',[original,original.id]);
 const history=[];for(let i=0;i<730;i++) { const day=new Date(Date.parse(date+'T12:00:00Z')-(i+1)*86400000).toISOString().slice(0,10);history.push({id:'history-'+i,habitId:running.id,playerId:'maciek',date:day,pointsEarned:20,completedAt:day+'T12:00:00Z'}); }
 for(const c of history)await db.query('insert into public.duel_check_ins values ($1,$2,$3,$4,$5)',[duel,c.id,c.habitId,c.playerId,c]);
 const requests=[]; let heldRead=null; let releaseRead=null;
 const server=http.createServer(async(req,res)=> {
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','*');res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.end();return;}
  try {
   let raw='';for await(const chunk of req)raw+=chunk;
   const body=raw?JSON.parse(raw):{};const path=new URL(req.url,'http://fixture').pathname;
   const entry={path,method:req.method,body};requests.push(entry);
   const result=await db.transaction(async tx=> {
    await tx.exec(`set local role authenticated; set local request.jwt.claim.sub='${owner}';`);
    if(path==='/rest/v1/duels'){const r=await tx.query('select * from public.duels where id=$1',[duel]);return {...r.rows[0],owner_color:'blue',guest_color:'purple'};}
    if(path==='/rest/v1/rpc/sync_duel')return (await tx.query('select public.sync_duel($1,$2) as result',[body.p_duel_id,body.p_after])).rows[0].result;
    if(path==='/rest/v1/rpc/duel_check_in_proof')return (await tx.query('select public.duel_check_in_proof($1,$2) as result',[body.p_duel_id,body.p_id])).rows[0].result;
    if(path==='/rest/v1/rpc/delete_duel_check_in'){await tx.query('select public.delete_duel_check_in($1,$2)',[body.p_duel_id,body.p_id]);return null;}
    if(path==='/rest/v1/rpc/save_duel_check_ins'){await tx.query('select public.save_duel_check_ins($1,$2)',[body.p_duel_id,body.p_check_ins]);return null;}
    if(path==='/rest/v1/duel_check_ins' && req.method==='DELETE') {const q=new URL(req.url,'http://fixture').searchParams;await tx.query('delete from public.duel_check_ins where duel_id=$1 and id=$2',[q.get('duel_id')?.slice(3),q.get('id')?.slice(3)]);return null;}
    throw Error('Unexpected fixture request '+req.method+' '+path);
   });
   if(path==='/rest/v1/rpc/sync_duel' && heldRead) { heldRead(); heldRead=null; await new Promise(resolve=>{releaseRead=resolve;}); }
   entry.bytes=Buffer.byteLength(JSON.stringify(result));res.end(JSON.stringify(result));
  }catch(error){res.statusCode=400;res.end(JSON.stringify({message:error.message,code:'FIXTURE'}));}
 });
 await new Promise(resolve=>server.listen(54421,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:1280,height:850}});const sockets=[];const errors=[];
  await context.routeWebSocket('**/realtime/v1/websocket**',ws=>{
   ws.onMessage(raw=> {
    const [joinRef,ref,topic,event,payload]=JSON.parse(raw);
    if(event==='phx_join') {
     const changes=(payload.config.postgres_changes||[]).map((change,i)=>({...change,id:i+1}));
     sockets.push({ws,topic,joinRef,changes});
     ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:changes}}]));
    } else if(event==='heartbeat' || event==='phx_leave')ws.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]));
   });
  });
  const tokenPayload={sub:owner,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+36000};
  const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')+'.fixture';
  await context.addInitScript(({owner,token})=>{
   if(!localStorage.getItem('sb-127-auth-token'))localStorage.setItem('sb-127-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture-refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+36000,expires_in:36000,user:{id:owner,email:'owner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{display_name:'Owner'},created_at:'2026-01-01T00:00:00Z'}}));
  },{owner,token});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.EGRESS_APP_URL||'http://127.0.0.1:54420');
  await page.getByText('Running',{exact:true}).first().waitFor();
  const readCache=()=>page.evaluate(async()=>{
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('do-it-duel-cache-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   const values=await new Promise(resolve=>{const r=db.transaction('snapshots').objectStore('snapshots').getAll();r.onsuccess=()=>resolve(r.result);});db.close();return values;
  });
  let cached;for(let i=0;i<20;i++){cached=await readCache();if(cached.length)break;await page.waitForTimeout(100);}
  assert.equal(cached[0].data.checkIns.length,731);assert.equal(JSON.stringify(cached).includes('data:image'),false);
  assert.equal(requests.filter(r=>r.path.endsWith('/duel_check_in_proof')).length,0);
  const beforeReload=requests.length;
  await page.reload();await page.getByText('Running',{exact:true}).first().waitFor();await page.waitForTimeout(500);
  assert(requests.slice(beforeReload).filter(r=>r.path.endsWith('/sync_duel')).every(r=>r.body.p_after!==null));
  const buttons=await page.getByRole('button').evaluateAll(elements=>elements.map(e=>({text:e.innerText,label:e.getAttribute('aria-label'),title:e.getAttribute('title')})));
  await fs.mkdir('.scratch/egress',{recursive:true});await fs.writeFile('.scratch/egress/buttons.json',JSON.stringify(buttons,null,2));
  await page.screenshot({path:'.scratch/egress/today.png',fullPage:true});
  const camera=page.getByRole('button',{name:/view proof/i}).first();
  if(await camera.count())await camera.click();else await page.locator('button[title*="proof"]').first().click();
  await page.getByRole('dialog',{name:'Proof photo gallery'}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('[role="dialog"] img')].some(img=>img.naturalWidth>0));
  assert.equal(requests.filter(r=>r.path.endsWith('/duel_check_in_proof')).length,1);
  await page.screenshot({path:'.scratch/egress/proof.png',fullPage:true});
  await page.getByRole('button',{name:'Close proof photo gallery'}).click();
  await db.query('select public.save_duel_check_ins($1,$2)',[duel,[{id:'check-1',habitId:habit.id,playerId:'maciek',note:'Remote note'}]]);
  const beforeBurst=requests.filter(r=>r.path.endsWith('/sync_duel')).length;
  for(let i=0;i<20;i++)for(const socket of sockets){const change=socket.changes.find(c=>c.table==='duel_sync_heads');if(change)socket.ws.send(JSON.stringify([socket.joinRef,null,socket.topic,'postgres_changes',{ids:[change.id],data:{schema:'public',table:'duel_sync_heads',type:'UPDATE',commit_timestamp:new Date().toISOString(),record:{duel_id:duel,revision:999},old_record:{},errors:null,columns:[{name:'duel_id',type:'uuid'},{name:'revision',type:'int8'}]}}]));}
  await page.waitForTimeout(700);
  const burstReads=requests.filter(r=>r.path.endsWith('/sync_duel')).length-beforeBurst;assert.equal(burstReads,1);
  cached=await readCache();assert.equal(cached[0].data.checkIns.find(c=>c.id==='check-1').note,'Remote note');
  assert.equal((await db.query('select public.duel_check_in_proof($1,$2) as value',[duel,'check-1'])).rows[0].value[0],pixel);
  // Drive a real metadata-only note save through the UI, preserving its proof.
  await page.getByRole('button',{name:'Edit note for Clean space'}).click();
  await page.getByRole('textbox',{name:'Reflection note for Clean space'}).fill('Saved in browser');
  await page.getByRole('textbox',{name:'Reflection note for Clean space'}).press('Enter');
  await page.waitForTimeout(500);
  assert.equal((await db.query('select data from public.duel_check_ins where id=$1',['check-1'])).rows[0].data.note,'Saved in browser');
  assert.equal((await db.query('select public.duel_check_in_proof($1,$2) as value',[duel,'check-1'])).rows[0].value[0],pixel);
  const emit=(table,count=1)=> { for(let i=0;i<count;i++)for(const socket of sockets){const change=socket.changes.find(c=>c.table===table);if(change)socket.ws.send(JSON.stringify([socket.joinRef,null,socket.topic,'postgres_changes',{ids:[change.id],data:{schema:'public',table,type:'UPDATE',commit_timestamp:new Date().toISOString(),record:table==='duels'?{id:duel}:{duel_id:duel,revision:999},old_record:{},errors:null,columns:[]}}]));} };
  const beforeProfile=requests.filter(r=>r.path.endsWith('/sync_duel')).length;
  await db.query('update public.duels set owner_name=$1 where id=$2',['Renamed owner',duel]);emit('duels');await page.waitForTimeout(500);
  assert.equal(requests.filter(r=>r.path.endsWith('/sync_duel')).length,beforeProfile);
  // A stale response arriving after a local Check-in must not undo the optimistic update.
  await db.query('select public.save_duel_check_ins($1,$2)',[duel,[{id:'check-1',habitId:habit.id,playerId:'maciek',note:'Changed during read'}]]);
  const held=new Promise(resolve=>{heldRead=resolve;});emit('duel_sync_heads');await held;
  await page.getByRole('button',{name:'Mark Running completed',exact:true}).click();
  await page.getByRole('button',{name:'Mark Running uncompleted for today',exact:true}).waitFor();
  releaseRead();
  for(let i=0;i<10;i++){assert.equal(await page.getByRole('button',{name:'Mark Running uncompleted for today',exact:true}).count(),1);await page.waitForTimeout(40);}
  await page.waitForTimeout(300);
  cached=await readCache();assert.equal(cached[0].data.checkIns.length,732);
  await context.setOffline(true);await page.waitForTimeout(200);
  assert.equal(await page.getByRole('button',{name:'Mark Running uncompleted for today',exact:true}).count(),1);
  await context.setOffline(false);await page.waitForTimeout(400);
  const runningCheck=(await db.query("select id from public.duel_check_ins where habit_id=$1 and data->>'date'=$2",[running.id,date])).rows[0].id;
  await db.query('delete from public.duel_check_ins where id=$1',[runningCheck]);emit('duel_sync_heads');
  await page.getByRole('button',{name:'Mark Running completed',exact:true}).waitFor();
  cached=await readCache();assert.equal(cached[0].data.checkIns.length,731);
  const report={historyRecords:cached[0].data.checkIns.length,photoRequestsBeforeViewing:0,photoRequestsForGallery:1,twentyEventBurstReads:burstReads,repeatReopenUsesDelta:true,noteSavePreservesProof:true,profileChangeHistoryReads:0,optimisticWriteSurvivesStaleRead:true,warmOfflineView:true,remoteDeletionApplied:true,pageErrors:errors,requests:requests.map(({path,method,bytes,body})=>({path,method,bytes,cursor:body.p_after}))};
  assert.deepEqual(errors,[]);await fs.writeFile('.scratch/egress/browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  await context.close();
 }finally{releaseRead?.();await browser.close();await new Promise(resolve=>server.close(resolve));await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

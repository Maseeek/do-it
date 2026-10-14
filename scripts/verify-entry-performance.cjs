const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseArgs } = require('node:util');
const { values } = parseArgs({ options: {
  baseline: { type:'string', default:'http://localhost:43131/' },
  current: { type:'string', default:'http://localhost:43132/' },
  output: { type:'string', default:'.scratch/entry-performance.json' },
  chrome: { type:'string' },
  smoke: { type:'boolean', default:false },
} });
const after = values.smoke;
const resultPath = path.resolve(values.output);
fs.mkdirSync(path.dirname(resultPath),{recursive:true});
const results = { measuredAt: new Date().toISOString(), method: 'Configured production copies, isolated contexts, empty local auth for default account creation or a synthetic account with an empty Duel for onboarding. First visit warms HTTP cache; five subsequent document reloads measure navigation start through a browser-local heading readiness probe and two animation frames. Mock requests take 50ms. No accounts are created.', variants: {} };
const owner = '11111111-1111-4111-8111-111111111111';
const guest = '22222222-2222-4222-8222-222222222222';
const user = { id: owner, email: 'entry-owner@local.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const duel = { id: '33333333-3333-4333-8333-333333333333', owner_id: owner, guest_id: guest, owner_name: 'Entry Owner', guest_name: 'Entry Guest', owner_color: 'blue', guest_color: 'purple', invite_code: '44444444-4444-4444-8444-444444444444' };

async function prepare(page, mode) {
  const savedHabits = [];
  const writes = [];
  if (mode === 'onboarding') await page.addInitScript(({ user, token }) => {
    localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: token, refresh_token: 'local-mock-refresh', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now()/1000)+86400, user }));
  }, { user, token: 'eyJhbGciOiJub25lIn0.' + Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now()/1000)+86400 })).toString('base64url') + '.local-mock' });
  await page.route('http://127.0.0.1:54321/**', async route => {
    const url = new URL(route.request().url());
    await new Promise(resolve => setTimeout(resolve, 50));
    const table = url.pathname.split('/').pop();
    if (table === 'duels') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([duel]) });
    assert.ok(['duel_habits','duel_check_ins','duel_stakes','duel_reactions','duel_rest_days'].includes(table));
    if (route.request().method()==='POST') {
      assert.equal(table,'duel_habits');
      const body=route.request().postDataJSON();
      for(const row of Array.isArray(body)?body:[body]) {
        assert.equal(row.duel_id,duel.id);
        assert.equal(row.player_slot,'maciek');
        savedHabits.push(row.data); writes.push({id:row.id,player:row.player_slot});
      }
      return route.fulfill({status:201,contentType:'application/json',body:''});
    }
    const data=table==='duel_habits'?savedHabits.map(data=>({data})):[];
    await route.fulfill({ status: 200, headers: { 'content-type':'application/json', 'content-range':data.length?`0-${data.length-1}/${data.length}`:'*/0', 'access-control-allow-origin':'*', 'access-control-expose-headers':'content-range' }, body: JSON.stringify(data) });
  });
  return {savedHabits,writes};
  await page.routeWebSocket('ws://127.0.0.1:54321/**', socket => {
    socket.onMessage(raw => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(raw));
      if (event === 'phx_join') {
        const filters = (payload.config?.postgres_changes ?? []).map((filter,index) => ({ ...filter, id:index+1 }));
        socket.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{postgres_changes:filters}}]));
      } else if (event === 'heartbeat' || event === 'phx_leave') socket.send(JSON.stringify([joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]));
    });
  });
}

(async () => {
  const browser = await chromium.launch({ headless:true, ...(values.chrome ? {executablePath:values.chrome} : {}) });
  results.browser = browser.version();
  try {
    for (const [name,url] of [['baseline',values.baseline],['current',values.current]]) {
      results.variants[name] = {};
      for (const mode of ['account-entry','onboarding']) {
        const context = await browser.newContext({ viewport:{width:1280,height:800}, timezoneId:'Europe/London', reducedMotion:'reduce' });
        const page = await context.newPage();
        const errors=[]; page.on('pageerror',error => errors.push(error.message));
        const fixture=await prepare(page,mode);
        const heading = mode === 'account-entry' ? 'Create your account' : 'Choose your habits.';
        await page.goto(url); await page.getByRole('heading',{name:heading,exact:true}).waitFor();
        const samples=[];
        for(let sample=1;sample<=5;sample++) {
          await page.goto(url,{waitUntil:'domcontentloaded'});
          const ms=await page.evaluate(async heading => {
            await new Promise((resolve,reject) => {
              const deadline = performance.now()+10000;
              function probe() {
                const ready=Array.from(document.querySelectorAll('h1')).some(h=>h.textContent.trim()===heading && h.getClientRects().length>0);
                if(ready) resolve();
                else if(performance.now()>deadline) reject(new Error('Heading timeout '+heading));
                else setTimeout(probe,5);
              }
              probe();
            });
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            return performance.now();
          },heading);
          samples.push({sample,ms});
        }
        assert.deepEqual(errors,[]);
        let smoke;
        if(after && name==='current') {
          if(mode==='account-entry') {
            await page.getByRole('button',{name:'Already have an account? Sign in',exact:true}).click();
            await page.getByRole('heading',{name:'Welcome back',exact:true}).waitFor();
            await page.getByRole('button',{name:'Need an account? Sign up',exact:true}).click();
            await page.getByRole('heading',{name:'Create your account',exact:true}).waitFor();
            smoke={modeSwitch:true};
          } else {
            await page.getByRole('textbox',{name:'New habit name',exact:true}).fill('Timing smoke habit');
            await page.getByRole('button',{name:'Add',exact:true}).click();
            await page.getByRole('button',{name:'Start with these habits',exact:true}).click();
            await page.getByRole('heading',{name:'Daily Ritual',exact:true}).waitFor();
            assert.ok(fixture.savedHabits.some(h=>h.title==='Timing smoke habit' && h.playerId==='maciek'));
            smoke={savedPlan:true,ownerWrites:fixture.writes.length};
          }
        }
        assert.deepEqual(errors,[]);
        results.variants[name][mode] = { samples,errors,smoke };
        await context.close();
      }
      fs.writeFileSync(resultPath,JSON.stringify(results,null,2));
      console.log(JSON.stringify({name,passed:true}));
    }
  } catch(error) {results.failure=error.message;throw error;}
  finally {fs.writeFileSync(resultPath,JSON.stringify(results,null,2));await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});

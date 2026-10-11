import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getTodayRecoveryUrl, recoverPageOnce } from './page-recovery';

test('recovery opens Today without replaying actions, callbacks or the failing view', () => {
  assert.equal(getTodayRecoveryUrl('https://do.example/?tab=progress&section=settings&action=checkin&habit=sleep&wearable_error=expired#main-content'), '/?tab=today');
  assert.equal(getTodayRecoveryUrl('https://do.example/old-page?invite=abc%2B123&tab=duel'), '/?tab=today&invite=abc%2B123');
  assert.equal(getTodayRecoveryUrl('https://do.example/?invite='), '/?tab=today&invite=');
});

test('automatic recovery reserves one attempt across remounts and failed reloads', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const navigations: string[] = [];
  const navigate = (url: string) => { navigations.push(url); };
  assert.equal(recoverPageOnce(storage, 'https://do.example/?tab=duel', navigate), true);
  assert.equal(recoverPageOnce(storage, 'https://do.example/?tab=today', navigate), false);
  assert.equal(recoverPageOnce(storage, 'https://do.example/?tab=progress', navigate), false);
  assert.deepEqual(navigations, ['/?tab=today']);
});

test('unavailable session storage leaves manual recovery instead of risking a reload loop', () => {
  for (const failure of ['read', 'write']) {
    const storage = {
      getItem: () => { if (failure === 'read') throw new Error('denied'); return null; },
      setItem: () => { throw new Error('quota'); },
    };
    assert.equal(recoverPageOnce(storage, 'https://do.example/', () => assert.fail('must not reload')), false);
  }
});

test('a failed navigation still consumes the automatic recovery attempt', () => {
  let saved: string | null = null;
  const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } };
  assert.equal(recoverPageOnce(storage, 'https://do.example/', () => { throw new Error('navigation failed'); }), false);
  assert.equal(recoverPageOnce(storage, 'https://do.example/', () => assert.fail('must not retry')), false);
});

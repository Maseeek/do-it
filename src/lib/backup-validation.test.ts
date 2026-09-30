import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitialState } from './seed';
import { parseBackup } from './backup';

function backupWithPhoto() {
  const state = getInitialState();
  state.checkIns = [{ id: 'proof-test', habitId: state.habits[0].id, playerId: state.habits[0].playerId, date: '2026-09-30', completedAt: '2026-09-30T09:00:00Z', pointsEarned: 10, proofUrls: ['data:image/jpeg;base64,/9j/'], note: 'Done' }];
  return state;
}

test('restores photo proofs and text notes from valid backups', () => {
  const state = backupWithPhoto();
  assert.deepEqual(parseBackup(JSON.stringify(state)).checkIns[0].proofUrls, state.checkIns[0].proofUrls);
  assert.equal(parseBackup(JSON.stringify(state)).checkIns[0].note, 'Done');
});

test('rejects objects in display fields before a backup can replace saved state', () => {
  const state = backupWithPhoto();
  const malformed = { ...state, checkIns: [{ ...state.checkIns[0], note: { unexpected: true } }] };
  assert.throws(() => parseBackup(JSON.stringify(malformed)), /check-in details/);
  assert.throws(() => parseBackup(JSON.stringify({ ...state, habits: [{ ...state.habits[0], description: [] }] })), /habit details/);
});

test('accepts portable image URLs but rejects non-image data and executable protocols', () => {
  const state = backupWithPhoto();
  for (const proofUrl of ['https://example.com/photo.jpg', 'data:image/png;base64,aGVsbG8=']) {
    assert.doesNotThrow(() => parseBackup(JSON.stringify({ ...state, checkIns: [{ ...state.checkIns[0], proofUrl }] })));
  }
  for (const proofUrl of ['javascript:alert(1)', 'data:text/html;base64,aGVsbG8=', { url: 'photo' }]) {
    assert.throws(() => parseBackup(JSON.stringify({ ...state, checkIns: [{ ...state.checkIns[0], proofUrl }] })), /proof photos/);
  }
});

test('rejects invalid preference values and empty check-in IDs', () => {
  const state = backupWithPhoto();
  assert.throws(() => parseBackup(JSON.stringify({ ...state, soundEnabled: 'false' })), /preferences/);
  assert.throws(() => parseBackup(JSON.stringify({ ...state, checkIns: [{ ...state.checkIns[0], id: '' }] })), /invalid check-in/);
});

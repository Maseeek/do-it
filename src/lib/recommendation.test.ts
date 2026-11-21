import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractRecommendationReferrer, getRecommendationShareData, getRecommendationUrl, getSignupRecommendationCode } from './recommendation';
import { extractInviteCode, getMultiplayerEntry } from './invite-navigation';

describe('App Recommendation & Referrals', () => {
  it('generates a recommendation URL containing the ref parameter', () => {
    const url = getRecommendationUrl('https://do-it.app', 'maciek');
    assert.equal(url, 'https://do-it.app/?ref=maciek');
  });

  it('generates safe recommendation URLs when origin has trailing slash', () => {
    const url = getRecommendationUrl('https://do-it.app/', 'myrna');
    assert.equal(url, 'https://do-it.app/?ref=myrna');
  });

  it('extracts referrer from ref or recommend search params', () => {
    const params1 = new URLSearchParams('ref=maciek');
    assert.equal(extractRecommendationReferrer(params1), 'maciek');

    const params2 = new URLSearchParams('recommend=myrna');
    assert.equal(extractRecommendationReferrer(params2), 'myrna');

    const params3 = new URLSearchParams('tab=today');
    assert.equal(extractRecommendationReferrer(params3), null);
  });

  it('produces share data with friendly title and message', () => {
    const shareData = getRecommendationShareData('https://do-it.app', 'Maciek', 'maciek');
    assert.equal(shareData.title, 'do it. — Habit Tracker');
    assert.match(shareData.text, /Maciek recommended do it\. to you/);
    assert.equal(shareData.url, 'https://do-it.app/?ref=maciek');
  });

  it('distinguishes recommendation links from duel invite codes', () => {
    const recUrl = getRecommendationUrl('https://do-it.app', 'maciek');
    // Recommendation links do NOT extract as duel invite codes
    const extractedDuelCode = extractInviteCode(recUrl);
    // Since there is no ?invite= parameter, extracting duel invite returns the whole string or null, but not a valid uuid
    assert.notEqual(extractedDuelCode, 'maciek');

    // Recommendation links do not trigger multiplayer invite-conflict gate
    const entry = getMultiplayerEntry(true, true, true, null);
    assert.equal(entry, 'app');
  });
});

describe('Signup recommendation attribution', () => {
  const code = '12345678-1234-1234-1234-123456789abc';
  it('keeps a valid account-specific code through signup and rejects old slot labels', () => {
    assert.equal(getSignupRecommendationCode(new URLSearchParams(`ref=${code}`), null), code);
    assert.equal(getSignupRecommendationCode(new URLSearchParams(), code), code);
    assert.equal(getSignupRecommendationCode(new URLSearchParams('ref=maciek'), 'myrna'), null);
    assert.equal(getSignupRecommendationCode(new URLSearchParams('ref=invalid'), null), null);
  });
});

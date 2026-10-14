import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  HERO_CONTENT,
  DOMAIN_CONCEPTS,
  MANIFESTO,
  PARITY_ENGINE_EXPLANATION,
  SIMULATOR_PRESETS,
  VERIFICATION_FEATURES,
  SETTLEMENT_SYSTEM,
  KARMA_SYSTEM,
  ONBOARDING_STEPS,
  PRICING_SPECIFICATION,
  FAQ_ITEMS,
  ONBOARDING_CONTENT,
  getPresetById,
  getDomainConceptById,
  getFaqItemsByCategory,
} from './onboarding-content';

describe('Onboarding Content & Domain Copy Integrity', () => {
  it('hero content contains high-craft, unslopped positioning', () => {
    assert.ok(HERO_CONTENT.headline.length > 0);
    assert.ok(HERO_CONTENT.subheadline.includes('Do It is an intimate two-player accountability duel'));
    assert.strictEqual(HERO_CONTENT.valuePillars.length, 3);
    assert.strictEqual(HERO_CONTENT.valuePillars[0].metric, '240 Par');
  });

  it('domain concepts include all core entities with architectural rationales and prohibited terms', () => {
    const requiredConcepts = ['duel', 'player', 'habit', 'equivalent-habit', 'check-in', 'proof', 'stake', 'karma', 'rest-day'];
    for (const conceptId of requiredConcepts) {
      const concept = getDomainConceptById(conceptId);
      assert.ok(concept, `Missing concept: ${conceptId}`);
      assert.ok(concept.definition.length > 20);
      assert.ok(concept.prohibitedTerms.length > 0);
      assert.ok(concept.architecturalRationale.length > 20);
    }
  });

  it('manifesto enforces the anti-freemium duo-subscription philosophy', () => {
    assert.ok(MANIFESTO.theFreemiumTrap.mechanisms.length >= 4);
    assert.ok(MANIFESTO.principles.length >= 5);
    assert.strictEqual(MANIFESTO.principles[4].title, 'Duo-Billing: One Subscription, Two Players');
    assert.ok(MANIFESTO.pricingAlignment.description.includes('We do not sell data'));
  });

  it('simulator presets strictly enforce 240 Daily Par (1680 weekly potential) with mathematical parity', () => {
    assert.ok(SIMULATOR_PRESETS.length >= 3);

    for (const preset of SIMULATOR_PRESETS) {
      assert.strictEqual(preset.dailyPar, 240);
      assert.strictEqual(preset.weeklyPotential, 1680);
      assert.strictEqual(preset.playerA.weeklyTotal, 1680);
      assert.strictEqual(preset.playerB.weeklyTotal, 1680);
      assert.strictEqual(preset.parityProof.isEqual, true);
      assert.strictEqual(preset.parityProof.pointDelta, 0);

      // Verify Player A math: sum of habit weeklyPoints equals 1680
      const calculatedPlayerA = preset.playerA.habits.reduce((acc, h) => acc + h.weeklyPoints, 0);
      assert.strictEqual(calculatedPlayerA, 1680, `${preset.id} Player A weekly sum (${calculatedPlayerA}) != 1680`);

      // Verify Player B math: sum of habit weeklyPoints equals 1680
      const calculatedPlayerB = preset.playerB.habits.reduce((acc, h) => acc + h.weeklyPoints, 0);
      assert.strictEqual(calculatedPlayerB, 1680, `${preset.id} Player B weekly sum (${calculatedPlayerB}) != 1680`);
    }
  });

  it('verification features document photo compression, wearable telemetry, and database idempotence', () => {
    const photo = VERIFICATION_FEATURES.find(f => f.category === 'camera');
    const wearable = VERIFICATION_FEATURES.find(f => f.category === 'wearable');
    const crypto = VERIFICATION_FEATURES.find(f => f.category === 'cryptography');

    assert.ok(photo && photo.technicalDetail.includes('EXIF'));
    assert.ok(wearable && wearable.supportedIntegrations && wearable.supportedIntegrations.length > 0);
    assert.ok(crypto && crypto.technicalDetail.includes('composite constraint'));
  });

  it('settlement mechanism details the Sunday midnight Hall of Champions ceremony', () => {
    assert.strictEqual(SETTLEMENT_SYSTEM.ceremonyName, 'The Hall of Champions');
    assert.ok(SETTLEMENT_SYSTEM.rules.length >= 4);
    assert.ok(SETTLEMENT_SYSTEM.curatedStakes.length >= 4);
  });

  it('karma system decouples lifetime consistency from weekly resets', () => {
    assert.ok(KARMA_SYSTEM.milestones.length >= 4);
    assert.strictEqual(KARMA_SYSTEM.milestones[0].points, 1000);
    assert.ok(KARMA_SYSTEM.contrastWithLeaderboard.length > 20);
  });

  it('onboarding steps guide the user through the 6-step initialization journey', () => {
    assert.strictEqual(ONBOARDING_STEPS.length, 6);
    assert.strictEqual(ONBOARDING_STEPS[0].slug, 'initialize-duel');
    assert.strictEqual(ONBOARDING_STEPS[1].slug, 'invite-counterpart');
    assert.strictEqual(ONBOARDING_STEPS[2].slug, 'assemble-habits');
    assert.strictEqual(ONBOARDING_STEPS[3].slug, 'calibrate-parity');
    assert.strictEqual(ONBOARDING_STEPS[4].slug, 'pledge-the-stake');
    assert.strictEqual(ONBOARDING_STEPS[5].slug, 'bind-telemetry');
  });

  it('pricing copy leaves purchasable prices to Stripe and makes no trial promise', () => {
    assert.deepStrictEqual(PRICING_SPECIFICATION.plans, []);
    assert.ok(PRICING_SPECIFICATION.trialPolicy.includes('No free trial'));
  });

  it('faq contains comprehensive coverage across all categories', () => {
    const philosophyFaq = getFaqItemsByCategory('philosophy');
    const parityFaq = getFaqItemsByCategory('parity');
    const hardwareFaq = getFaqItemsByCategory('hardware');
    const subscriptionFaq = getFaqItemsByCategory('subscription');
    const fairnessFaq = getFaqItemsByCategory('fairness');

    assert.ok(philosophyFaq.length > 0);
    assert.ok(parityFaq.length > 0);
    assert.ok(hardwareFaq.length > 0);
    assert.ok(subscriptionFaq.length > 0);
    assert.ok(fairnessFaq.length > 0);
  });

  it('preset finder helper returns expected presets or undefined', () => {
    assert.ok(getPresetById('athlete-vs-creator'));
    assert.strictEqual(getPresetById('non-existent-preset'), undefined);
  });

  it('aggregate content package bundles all structured copy', () => {
    assert.strictEqual(ONBOARDING_CONTENT.hero, HERO_CONTENT);
    assert.strictEqual(ONBOARDING_CONTENT.domainConcepts, DOMAIN_CONCEPTS);
    assert.strictEqual(ONBOARDING_CONTENT.manifesto, MANIFESTO);
    assert.strictEqual(ONBOARDING_CONTENT.simulatorPresets, SIMULATOR_PRESETS);
    assert.strictEqual(ONBOARDING_CONTENT.pricing, PRICING_SPECIFICATION);
    assert.strictEqual(ONBOARDING_CONTENT.faq, FAQ_ITEMS);
  });
});

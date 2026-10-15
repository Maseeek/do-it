import type { HabitCategory } from './types';

// ============================================================================
// DO IT — Multi-Tenant Two-Player Habit Parity & Accountability Engine
// Domain Copy, Manifesto, Simulator Presets, Onboarding & Pricing Specifications
// ============================================================================

export type VerificationType = 'photo' | 'wearable' | 'manual';
export type DomainCategory = 'entity' | 'mechanic' | 'settlement' | 'integrity';
export type FaqCategory = 'philosophy' | 'parity' | 'hardware' | 'subscription' | 'fairness';

export interface HeroContent {
  kicker: string;
  headline: string;
  subheadline: string;
  emphasisPhrase: string;
  primaryCta: {
    label: string;
    sublabel: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    sublabel: string;
    href: string;
  };
  valuePillars: Array<{
    label: string;
    metric: string;
    context: string;
  }>;
}

export interface DomainConcept {
  id: string;
  term: string;
  category: DomainCategory;
  summary: string;
  definition: string;
  prohibitedTerms: string[];
  architecturalRationale: string;
}

export interface ManifestoPoint {
  index: string;
  title: string;
  critique: string;
  counterPosition: string;
  architecturalEnforcement: string;
}

export interface AntiFreemiumManifesto {
  headline: string;
  subheadline: string;
  coreThesis: string;
  theFreemiumTrap: {
    title: string;
    mechanisms: Array<{
      flaw: string;
      industryStandard: string;
      doItArchitecture: string;
    }>;
  };
  principles: ManifestoPoint[];
  pricingAlignment: {
    headline: string;
    description: string;
    pairEconomics: string;
  };
}

export interface SimulatorHabitItem {
  title: string;
  category: HabitCategory;
  points: number;
  frequency: 'daily' | 'weekly';
  weeklyTargetDays: number;
  weeklyPoints: number;
  verificationType: VerificationType;
  iconName: string;
  telemetryBinding?: string;
  notes?: string;
}

export interface SimulatorPlayerPlan {
  role: 'owner' | 'guest';
  archetype: string;
  personaTitle: string;
  lifestyleContext: string;
  habits: SimulatorHabitItem[];
  weeklyTotal: number;
  dailyParEquivalent: number;
}

export interface ParityPreset {
  id: string;
  title: string;
  tagline: string;
  description: string;
  dailyPar: number;
  weeklyPotential: number;
  playerA: SimulatorPlayerPlan;
  playerB: SimulatorPlayerPlan;
  parityProof: {
    isEqual: boolean;
    pointDelta: number;
    explanation: string;
  };
}

export interface VerificationFeature {
  id: string;
  title: string;
  badge: string;
  category: 'camera' | 'wearable' | 'cryptography';
  summary: string;
  technicalDetail: string;
  supportedIntegrations?: string[];
}

export interface SettlementMechanism {
  id: string;
  name: string;
  ceremonyName: string;
  schedule: string;
  triggerTime: string;
  description: string;
  rules: string[];
  curatedStakes: Array<{
    title: string;
    category: 'ritual' | 'experience' | 'forfeit' | 'privilege';
    commitment: string;
  }>;
}

export interface KarmaMilestone {
  points: number;
  name: string;
  description: string;
  badgeId: string;
}

export interface KarmaSystemContent {
  headline: string;
  subheadline: string;
  definition: string;
  contrastWithLeaderboard: string;
  permanenceRule: string;
  milestones: KarmaMilestone[];
}

export interface OnboardingStep {
  stepNumber: number;
  slug: string;
  title: string;
  shortTitle: string;
  tagline: string;
  instruction: string;
  technicalMechanism: string;
  actorRequirement: 'solo' | 'bilateral' | 'passive';
  estimatedSeconds: number;
  tips: string[];
}

export interface PricingPlan {
  id: 'monthly' | 'annual';
  name: string;
  cadence: 'month' | 'year';
  amountUsd: number;
  perMonthEquivalentUsd: number;
  discountPercentage?: number;
  badge?: string;
  billStatement: string;
  perPersonBreakdown: string;
  features: string[];
  ctaLabel: string;
}

export interface PricingSpecification {
  headline: string;
  subheadline: string;
  pairModelClarification: string;
  trialPolicy: string;
  guaranteeNotice: string;
  plans: PricingPlan[];
  commitments: string[];
}

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  footNote?: string;
}

// ============================================================================
// 1. HERO CONTENT
// ============================================================================

export const HERO_CONTENT: HeroContent = {
  kicker: 'Two-Player Habit Parity Engine',
  headline: 'Asymmetric lives. Equal stakes.',
  subheadline:
    'Do It is an intimate two-player accountability duel. You choose your habits, your partner chooses theirs, and our engine calibrates both routines to an identical point ceiling. Sunday midnight settles the week.',
  emphasisPhrase: 'No public feeds. No solo surrender. One shared wager.',
  primaryCta: {
    label: 'Initialize Duel',
    sublabel: 'One subscription covers both players',
    href: '/#start',
  },
  secondaryCta: {
    label: 'Explore Parity Math',
    sublabel: 'How 240 Daily Par balances unlike lives',
    href: '/#simulator',
  },
  valuePillars: [
    {
      label: 'Calibrated Parity',
      metric: '240 Par',
      context: 'Both players share identical weekly point ceilings regardless of habit choices',
    },
    {
      label: 'Verified Telemetry',
      metric: '0 Cheats',
      context: 'Direct Apple Health, Garmin, and client-compressed photo confirmation',
    },
    {
      label: 'Duo Economics',
      metric: '$6 / mo',
      context: 'One subscription covers both participants; see current billing plans',
    },
  ],
};

// ============================================================================
// 2. DOMAIN CONCEPTS & UBIQUITOUS LANGUAGE
// Strict alignment with CONTEXT.md & Domain-Driven Architecture
// ============================================================================

export const DOMAIN_CONCEPTS: DomainConcept[] = [
  {
    id: 'duel',
    term: 'Duel',
    category: 'entity',
    summary: 'An isolated two-player competitive tenancy.',
    definition:
      'A private, cryptographically secured boundary connecting exactly two participants: an owner and a guest. Every habit, check-in, rest day, reaction, and stake exists strictly inside this single tenancy, protected by PostgreSQL Row-Level Security.',
    prohibitedTerms: ['Room', 'Group', 'Team', 'Workspace', 'Organization', 'Channel'],
    architecturalRationale:
      'Accountability collapses in groups. Group trackers allow social loafing and silent dropouts. A Duel is strictly dyadic: if one player slows down, the tension is immediate and visible.',
  },
  {
    id: 'player',
    term: 'Player',
    category: 'entity',
    summary: 'One of the two authenticated participants in a Duel.',
    definition:
      'An individual bound to either the owner or guest slot within a Duel. Each Player holds read visibility across the shared tenancy but holds write authority exclusively over their own habits, check-ins, and rest days.',
    prohibitedTerms: ['User', 'Customer', 'Client', 'Member', 'Subscriber', 'Account'],
    architecturalRationale:
      'Language shapes posture. Users consume; Players enter an arena with rules, agency, and counterpart responsibility.',
  },
  {
    id: 'habit',
    term: 'Habit',
    category: 'entity',
    summary: 'A recurring behavioral commitment with explicit mathematical weight.',
    definition:
      'A personal daily or weekly routine defined by a point value (5–100 pts), category classification, target cadence, and optional quantitative or automated hardware criteria. Habits are not checkboxes; they are calibrated commitments.',
    prohibitedTerms: ['Task', 'Todo', 'Chore', 'Goal', 'Item', 'Reminder'],
    architecturalRationale:
      'Todo items end when checked. Habits are permanent behavioral loops whose value compounds through consistent execution.',
  },
  {
    id: 'equivalent-habit',
    term: 'Equivalent Habit',
    category: 'mechanic',
    summary: 'Asymmetric routines calibrated to an identical weekly point potential.',
    definition:
      'The foundational innovation of Do It. A marathoner and an author cannot perform the same actions, but their routines can be mathematically balanced to 240 Daily Par (1,680 weekly potential). Neither player gets a handicap; both encounter equivalent discipline ceilings.',
    prohibitedTerms: ['Handicap', 'Custom Task', 'Unbalanced Habit', 'Equalizer', 'Cheat Weight'],
    architecturalRationale:
      'Enforcing identical routines between two people creates resentment or abandonment. Equivalent habits respect divergent biological and professional realities while preserving razor-sharp competitive balance.',
  },
  {
    id: 'check-in',
    term: 'Check-in',
    category: 'mechanic',
    summary: 'An idempotent behavioral record stamped to a local civil date.',
    definition:
      'The verifiable registration of habit completion. Enforced at the database layer by the composite uniqueness constraint (duel_id, habit_id, date). Replays are safe; duplicate double-counting is mathematically impossible.',
    prohibitedTerms: ['Tick-off', 'Completion', 'Log', 'Entry', 'Click', 'Submission'],
    architecturalRationale:
      'Distributed offline mobile usage requires mathematical idempotence. A Check-in represents an atomic truth about a calendar day.',
  },
  {
    id: 'proof',
    term: 'Proof',
    category: 'integrity',
    summary: 'Visual confirmation compressed client-side or hardware telemetry.',
    definition:
      'Client-side compressed photo verification (EXIF stripped for privacy) or automated biometric telemetry (Apple Health, Garmin, Strava). Proof is surfaced directly in the shared activity feed and duel gallery for peer inspection.',
    prohibitedTerms: ['Attachment', 'Evidence', 'Upload', 'Screenshot', 'File'],
    architecturalRationale:
      'Self-reported checkboxes invite rationalization and self-deception. Proof introduces frictionless verification without corporate surveillance.',
  },
  {
    id: 'stake',
    term: 'Stake',
    category: 'settlement',
    summary: 'The mutual real-world reward or forfeit wagered on the leaderboard window.',
    definition:
      'A tangible covenant agreed upon before the weekly or monthly competition cycle starts (e.g. Sunday dinner date, chore forfeit, or weekend excursion). Settled and permanently inscribed into the Hall of Champions ledger upon period close.',
    prohibitedTerms: ['Prize', 'Bounty', 'Purchase', 'Shop Item', 'Bet', 'Gamble'],
    architecturalRationale:
      'Digital points without physical consequence fade into apathy. A tangible stake grounds daily discipline into shared lived experience.',
  },
  {
    id: 'karma',
    term: 'Karma',
    category: 'mechanic',
    summary: 'The permanent, non-spendable lifetime consistency score.',
    definition:
      'The immutable sum of all historical check-in points earned by a Player since duel inception. Karma never resets, cannot be gambled, and cannot be spent. It is an unassailable record of lifetime discipline.',
    prohibitedTerms: ['XP', 'Currency', 'Balance', 'Spendable Tokens', 'Credits', 'Coins'],
    architecturalRationale:
      'Weekly competitions provide urgency; Karma provides decadal legacy. Decoupling lifetime consistency from the weekly reset prevents defeatism.',
  },
  {
    id: 'rest-day',
    term: 'Rest Day',
    category: 'mechanic',
    summary: 'An explicit declared recovery date that safeguards streak continuity.',
    definition:
      'A declared pause scoped to a specific Player within the Duel. Rest Days preserve streak longevity without generating artificial leaderboard points, eliminating the toxic incentive to train injured or burn out.',
    prohibitedTerms: ['Cheat Day', 'Skip', 'Freeze Token', 'Freebie', 'Pass'],
    architecturalRationale:
      'Recovery is a biological necessity. Honest recovery declared in advance differs fundamentally from covert failure or gamified freeze tokens.',
  },
];

// ============================================================================
// 3. THE ANTI-FREEMIUM MANIFESTO
// Precision critique of extractive product models
// ============================================================================

export const MANIFESTO: AntiFreemiumManifesto = {
  headline: 'Accountability requires skin in the game.',
  subheadline:
    'Free apps monetize your distracted gaze. Do It is a paid mechanical engine designed for two people to conquer inertia.',
  coreThesis:
    'When software is free, the product is your attention. To keep you returning, free apps rely on fake streaks, frictionless checkboxes, intrusive ad networks, and selling private health data. Real behavioral change cannot exist on a foundation of zero-cost promises. We charge a fair, transparent subscription for both players so our incentives remain uncompromised.',
  theFreemiumTrap: {
    title: 'The Anatomy of the Freemium Illusion',
    mechanisms: [
      {
        flaw: 'The Zero-Cost Surrender Trap',
        industryStandard:
          'Free downloads with immediate abandonment after 4 days. Zero financial friction means zero emotional stake.',
        doItArchitecture:
          'One subscription shared between two players supports the Duel.',
      },
      {
        flaw: 'Vanity Streaks & Fake Checkboxes',
        industryStandard:
          'Easily gamed checkmarks without verification. Apps celebrate hollow streaks to boost daily active user (DAU) graphs.',
        doItArchitecture:
          'Equivalent Habit point parities (240 Par) combined with required photo proof and direct wearable telemetry.',
      },
      {
        flaw: 'Surveillance Monetization',
        industryStandard:
          'Ad tracking SDKs scraping sleep cycles, biometrics, and mental health logs to target behavioural ads.',
        doItArchitecture:
          'Zero third-party advertising, zero tracking SDKs, client-side EXIF stripping, and strict tenant isolation.',
      },
      {
        flaw: 'Dark Pattern Dopamine Cycles',
        industryStandard:
          'Artificial coin shops, energy bars, push notification cascades, and gambling mechanics designed for screen time.',
        doItArchitecture:
          'Quiet, high-craft, tool-grade interface. Minimal haptics, purposeful sound design, and an exit back into real life.',
      },
    ],
  },
  principles: [
    {
      index: '01',
      title: 'Dyadic Tenancy Over Social Feeds',
      critique:
        'Social habit apps build global feeds, follower graphs, and public vanity metrics where accountability diffuses into performative posting.',
      counterPosition:
        'Meaningful accountability exists exclusively between two humans who look each other in the eye.',
      architecturalEnforcement:
        'A Duel is capped at exactly two players. There are no public leaderboards, no follower lists, and no algorithmic discovery.',
    },
    {
      index: '02',
      title: 'Equivalent Calibration Over Generic Checklists',
      critique:
        'Generic trackers assume all humans have identical schedules and identical goals, or leave point weighting entirely arbitrary.',
      counterPosition:
        'Different lives require different habits, but competitive fairness demands calibrated equivalence.',
      architecturalEnforcement:
        'The 240 Daily Par engine solves a constrained knapsack problem to balance asymmetric weekly point potentials to the exact same total.',
    },
    {
      index: '03',
      title: 'Verifiable Proof Over Honour-System Slop',
      critique:
        'Tapping a digital button while lying in bed is not discipline. The honour system decays under fatigue.',
      counterPosition:
        'Habits must be corroborated by physical evidence or biometric telemetry.',
      architecturalEnforcement:
        'Local image downsampling with stripped EXIF and background synchronization with Apple Health, Garmin, and Strava.',
    },
    {
      index: '04',
      title: 'Sunday Settlement Over Endless Rolling Streaks',
      critique:
        'Endless streaks create irrational anxiety. Once an arbitrary 200-day streak breaks, users quit entirely out of demoralization.',
      counterPosition:
        'Discipline thrives in recurring, bounded campaign windows with tangible real-world consequences.',
      architecturalEnforcement:
        'Leaderboard scores reset every Sunday midnight. The winner claims the stake, the slate wipes clean, and lifetime Karma preserves long-term legacy.',
    },
    {
      index: '05',
      title: 'Duo-Billing: One Subscription, Two Players',
      critique:
        'SaaS companies nickel-and-dime each user with separate paywalls, referral traps, and bait-and-switch guest restrictions.',
      counterPosition:
        'Accountability is a shared pact. One partner paying should invite the other without friction or secondary billing.',
      architecturalEnforcement:
        'One flat subscription covers the owner and the guest for the entire life of the Duel.',
    },
  ],
  pricingAlignment: {
    headline: 'Alignment of Purpose',
    description:
      'We do not sell data. We do not run ads. We do not manipulate your dopamine. You pay us for an uncompromising instrument of personal discipline, and we build the fastest, most reliable engine on earth to deliver it.',
    pairEconomics:
      'The Duel owner manages one subscription for both players. See current plans before purchasing.',
  },
};

// ============================================================================
// 4. PARITY SIMULATOR PRESETS & ALGORITHM EXPLANATION
// ============================================================================

export const PARITY_ENGINE_EXPLANATION = {
  headline: 'The Mathematics of 240 Daily Par',
  subheadline:
    'How two humans with radically divergent lives compete on perfectly even terms.',
  dailyParValue: 240,
  weeklyPointCeiling: 1680, // 240 * 7
  corePhilosophy:
    'Competitive parity does not mean doing the same exercises or reading the same books. It means committing an equivalent proportion of human intentionality toward disciplined living. In Do It, every valid duel plan is calibrated to 1,680 weekly points (240 Daily Par).',
  algorithmicSteps: [
    {
      step: '1. Asymmetric Selection',
      detail:
        'Player A selects strength training, hydration, and deep work blocks. Player B selects marathon endurance, language fluency, and meditation.',
    },
    {
      step: '2. Cadence & Unit Weighting',
      detail:
        'Daily habits provide baseline foundations (10–25 pts). High-intensity sessions (workout 4x/week, cardio 3x/week) are assigned weighted session values.',
    },
    {
      step: '3. Knapsack Balancing',
      detail:
        'The engine balances point distributions across both active plans so that both players reach the exact 1,680 weekly ceiling. Neither player has an unearned advantage.',
    },
  ],
};

export const SIMULATOR_PRESETS: ParityPreset[] = [
  {
    id: 'athlete-vs-creator',
    title: 'The Athlete & The Creator',
    tagline: 'Endurance physiology meets intellectual craftsmanship',
    description:
      'One partner is training for an Ironman triathlon; the other is writing a manuscript and shipping software. Radically different physical exertion, calibrated to identical weekly output.',
    dailyPar: 240,
    weeklyPotential: 1680,
    playerA: {
      role: 'owner',
      archetype: 'The Athlete',
      personaTitle: 'Endurance & Physical Mastery',
      lifestyleContext: 'Early morning cardio, high protein intake, progressive overload lifting',
      weeklyTotal: 1680,
      dailyParEquivalent: 240,
      habits: [
        {
          title: 'Sleep 8+ Hours',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Moon',
          telemetryBinding: 'Apple Health / Garmin Sleep Analysis',
        },
        {
          title: 'Strength Training',
          category: 'physical',
          points: 40,
          frequency: 'weekly',
          weeklyTargetDays: 4,
          weeklyPoints: 160,
          verificationType: 'wearable',
          iconName: 'Dumbbell',
          telemetryBinding: 'Garmin Strength Activity (45m+)',
        },
        {
          title: 'Zone 2 Running / Cycling',
          category: 'cardio',
          points: 45,
          frequency: 'weekly',
          weeklyTargetDays: 4,
          weeklyPoints: 180,
          verificationType: 'wearable',
          iconName: 'Heart',
          telemetryBinding: 'Strava / Garmin Cardio Telemetry',
        },
        {
          title: '12,000 Daily Steps',
          category: 'physical',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Footprints',
          telemetryBinding: 'HealthKit Step Rollup',
        },
        {
          title: 'Clean High-Protein Fueling',
          category: 'nutrition',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'photo',
          iconName: 'Apple',
          notes: 'Meal photo verification',
        },
        {
          title: 'Cold Mobility & Stretch',
          category: 'physical',
          points: 20,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 140,
          verificationType: 'photo',
          iconName: 'Activity',
        },
        {
          title: 'Deep Sports Hydration (3.5L)',
          category: 'foundation',
          points: 20,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 140,
          verificationType: 'manual',
          iconName: 'Sparkles',
        },
        {
          title: 'Rest & Mental Stillness',
          category: 'mind',
          points: 20,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 140,
          verificationType: 'manual',
          iconName: 'Sparkles',
        },
        {
          title: 'Evening Athletic Recovery Log',
          category: 'mind',
          points: 56,
          frequency: 'weekly',
          weeklyTargetDays: 7,
          weeklyPoints: 395,
          verificationType: 'manual',
          iconName: 'Target',
        },
      ],
    },
    playerB: {
      role: 'guest',
      archetype: 'The Creator',
      personaTitle: 'Deep Cognitive Craft & Focus',
      lifestyleContext: 'Desk-based intellectual output, writing, code architecture, language acquisition',
      weeklyTotal: 1680,
      dailyParEquivalent: 240,
      habits: [
        {
          title: 'Sleep 8+ Hours',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Moon',
          telemetryBinding: 'Oura Sleep Ring',
        },
        {
          title: 'Deep Work Block (90m Uninterrupted)',
          category: 'deep_work',
          points: 50,
          frequency: 'daily',
          weeklyTargetDays: 6,
          weeklyPoints: 300,
          verificationType: 'photo',
          iconName: 'Briefcase',
          notes: 'Photo of focused workspace without tabs',
        },
        {
          title: 'Book Reading (30 Pages)',
          category: 'intellect',
          points: 30,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 210,
          verificationType: 'photo',
          iconName: 'BookOpen',
          notes: 'Annotated page capture',
        },
        {
          title: 'Swedish / Polish Language Study',
          category: 'language',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'photo',
          iconName: 'Globe',
          notes: 'Completed session screenshot',
        },
        {
          title: 'Daily Movement Walk (8k Steps)',
          category: 'physical',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Footprints',
          telemetryBinding: 'Apple Health Steps',
        },
        {
          title: 'Writing & Synthesizing Notes',
          category: 'skills',
          points: 35,
          frequency: 'weekly',
          weeklyTargetDays: 5,
          weeklyPoints: 175,
          verificationType: 'manual',
          iconName: 'Target',
        },
        {
          title: 'Physical Workspace Reset',
          category: 'environment',
          points: 20,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 140,
          verificationType: 'photo',
          iconName: 'CheckCircle2',
          notes: 'Clean desk verification',
        },
        {
          title: 'Zero Screen Time 45m Before Bed',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'manual',
          iconName: 'Moon',
        },
        {
          title: 'Weekly Financial & Review Audit',
          category: 'finance',
          points: 155,
          frequency: 'weekly',
          weeklyTargetDays: 1,
          weeklyPoints: 155,
          verificationType: 'manual',
          iconName: 'Briefcase',
        },
      ],
    },
    parityProof: {
      isEqual: true,
      pointDelta: 0,
      explanation:
        'Both players accumulate exactly 1,680 points across seven days. Player A earns high points through athletic training volume; Player B earns high points through uninterrupted intellectual focus. The competition is strictly fair.',
    },
  },
  {
    id: 'founder-vs-resident',
    title: 'The Startup Founder & The Medical Resident',
    tagline: 'High-uncertainty builder meets rigorous clinical shifts',
    description:
      'A founder navigating sprint deliverables competing with a junior doctor on grueling hospital rotations. Fixed weekly sessions preserve accountability amid erratic working hours.',
    dailyPar: 240,
    weeklyPotential: 1680,
    playerA: {
      role: 'owner',
      archetype: 'The Founder',
      personaTitle: 'Velocity & Company Building',
      lifestyleContext: 'Product shipping, cold outreach, strength workouts, cognitive stability',
      weeklyTotal: 1680,
      dailyParEquivalent: 240,
      habits: [
        {
          title: 'Consistent Wakeup (06:30)',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Moon',
        },
        {
          title: 'Morning Product Ship Block (2h)',
          category: 'deep_work',
          points: 45,
          frequency: 'weekly',
          weeklyTargetDays: 5,
          weeklyPoints: 225,
          verificationType: 'photo',
          iconName: 'Briefcase',
        },
        {
          title: 'Strength Lifting Session',
          category: 'physical',
          points: 40,
          frequency: 'weekly',
          weeklyTargetDays: 4,
          weeklyPoints: 160,
          verificationType: 'wearable',
          iconName: 'Dumbbell',
        },
        {
          title: 'Customer Discovery / Outreach',
          category: 'skills',
          points: 35,
          frequency: 'weekly',
          weeklyTargetDays: 5,
          weeklyPoints: 175,
          verificationType: 'manual',
          iconName: 'Target',
        },
        {
          title: '10,000 Steps',
          category: 'physical',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Footprints',
        },
        {
          title: 'Macro-Tracked Nutrition',
          category: 'nutrition',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'photo',
          iconName: 'Apple',
        },
        {
          title: 'Non-Fiction Reading (20m)',
          category: 'intellect',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'manual',
          iconName: 'BookOpen',
        },
        {
          title: 'Digital Shutdown by 22:30',
          category: 'foundation',
          points: 20,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 140,
          verificationType: 'manual',
          iconName: 'Moon',
        },
        {
          title: 'Weekly P&L and Metrics Sync',
          category: 'finance',
          points: 140,
          frequency: 'weekly',
          weeklyTargetDays: 2,
          weeklyPoints: 280,
          verificationType: 'manual',
          iconName: 'Briefcase',
        },
      ],
    },
    playerB: {
      role: 'guest',
      archetype: 'The Medical Resident',
      personaTitle: 'Clinical Endurance & Patient Care',
      lifestyleContext: '12-hour hospital shifts, emergency triage, clinical literature recall',
      weeklyTotal: 1680,
      dailyParEquivalent: 240,
      habits: [
        {
          title: 'Clinical Hydration (2.5L Water Bottle)',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'photo',
          iconName: 'Sparkles',
        },
        {
          title: 'Daily Shift Steps (12,000 Steps)',
          category: 'physical',
          points: 30,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 210,
          verificationType: 'wearable',
          iconName: 'Footprints',
          telemetryBinding: 'Apple Watch',
        },
        {
          title: 'Medical Journal Paper Review',
          category: 'intellect',
          points: 40,
          frequency: 'weekly',
          weeklyTargetDays: 4,
          weeklyPoints: 160,
          verificationType: 'photo',
          iconName: 'BookOpen',
        },
        {
          title: 'High-Intensity Calisthenics / Run',
          category: 'cardio',
          points: 45,
          frequency: 'weekly',
          weeklyTargetDays: 3,
          weeklyPoints: 135,
          verificationType: 'wearable',
          iconName: 'Heart',
        },
        {
          title: 'Shift Meal Prep (Non-Cafeteria)',
          category: 'nutrition',
          points: 30,
          frequency: 'weekly',
          weeklyTargetDays: 5,
          weeklyPoints: 150,
          verificationType: 'photo',
          iconName: 'Apple',
        },
        {
          title: 'Post-Shift Mindful Decompression',
          category: 'mind',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'manual',
          iconName: 'Sparkles',
        },
        {
          title: 'Targeted Sleep Hygiene Protocol',
          category: 'foundation',
          points: 35,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 245,
          verificationType: 'wearable',
          iconName: 'Moon',
        },
        {
          title: 'Emergency Response Flashcard Drill',
          category: 'skills',
          points: 30,
          frequency: 'weekly',
          weeklyTargetDays: 5,
          weeklyPoints: 150,
          verificationType: 'manual',
          iconName: 'Target',
        },
        {
          title: 'Weekly Clinical Review & Recovery',
          category: 'environment',
          points: 280,
          frequency: 'weekly',
          weeklyTargetDays: 1,
          weeklyPoints: 280,
          verificationType: 'manual',
          iconName: 'CheckCircle2',
        },
      ],
    },
    parityProof: {
      isEqual: true,
      pointDelta: 0,
      explanation:
        'A medical resident on shift cannot perform scheduled 2-hour coding blocks; a software founder cannot claim hospital triage steps. Calibrating both to 1,680 weekly points delivers parity without asking either to compromise their craft.',
    },
  },
  {
    id: 'mindfulness-vs-discipline',
    title: 'The Stoic Scholar & The Kinetic Builder',
    tagline: 'Quiet contemplative habits paired with explosive kinetic output',
    description:
      'Demonstrating that mental disciplines (journaling, meditation, cold exposure, writing) carry the exact same mathematical weight as barbell squats, sprinting, and metabolic conditioning.',
    dailyPar: 240,
    weeklyPotential: 1680,
    playerA: {
      role: 'owner',
      archetype: 'The Stoic Scholar',
      personaTitle: 'Internal Equilibrium & Wisdom',
      lifestyleContext: 'Meditation, physical stillness, classical literature, rigorous reflection',
      weeklyTotal: 1680,
      dailyParEquivalent: 240,
      habits: [
        {
          title: 'Morning Silence & Meditation (20m)',
          category: 'mind',
          points: 35,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 245,
          verificationType: 'manual',
          iconName: 'Sparkles',
        },
        {
          title: 'Daily Handwritten Reflection',
          category: 'mind',
          points: 30,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 210,
          verificationType: 'photo',
          iconName: 'BookOpen',
          notes: 'Notebook photo',
        },
        {
          title: 'Classical Philosophy Reading (45m)',
          category: 'intellect',
          points: 35,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 245,
          verificationType: 'manual',
          iconName: 'BookOpen',
        },
        {
          title: 'Cold Exposure Shower / Plunge',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'manual',
          iconName: 'Sparkles',
        },
        {
          title: 'Mindful Walking (45m)',
          category: 'physical',
          points: 30,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 210,
          verificationType: 'wearable',
          iconName: 'Footprints',
        },
        {
          title: 'Intermittent Fasting (16h)',
          category: 'nutrition',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'manual',
          iconName: 'Apple',
        },
        {
          title: 'Living Space Minimalist Reset',
          category: 'environment',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'photo',
          iconName: 'CheckCircle2',
        },
        {
          title: 'Sleep 8 Hours',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Moon',
        },
        {
          title: 'Weekly Digital Fast (4 Hours Offline)',
          category: 'deep_work',
          points: 70,
          frequency: 'weekly',
          weeklyTargetDays: 1,
          weeklyPoints: 70,
          verificationType: 'manual',
          iconName: 'Target',
        },
      ],
    },
    playerB: {
      role: 'guest',
      archetype: 'The Kinetic Builder',
      personaTitle: 'Mechanical Velocity & Physical Drive',
      lifestyleContext: 'Heavy barbell compound lifts, high-output coding, cycling intervals',
      weeklyTotal: 1680,
      dailyParEquivalent: 240,
      habits: [
        {
          title: 'Heavy Barbell Compound Session',
          category: 'physical',
          points: 50,
          frequency: 'weekly',
          weeklyTargetDays: 4,
          weeklyPoints: 200,
          verificationType: 'wearable',
          iconName: 'Dumbbell',
        },
        {
          title: 'HIIT / Sprint Intervals (25m)',
          category: 'cardio',
          points: 40,
          frequency: 'weekly',
          weeklyTargetDays: 3,
          weeklyPoints: 120,
          verificationType: 'wearable',
          iconName: 'Heart',
        },
        {
          title: 'Deep Engineering Focus (90m)',
          category: 'deep_work',
          points: 45,
          frequency: 'daily',
          weeklyTargetDays: 5,
          weeklyPoints: 225,
          verificationType: 'photo',
          iconName: 'Briefcase',
        },
        {
          title: '10,000 Daily Steps',
          category: 'physical',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Footprints',
        },
        {
          title: 'Strict Whole-Food Protein Intake',
          category: 'nutrition',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'photo',
          iconName: 'Apple',
        },
        {
          title: 'Sleep 8 Hours',
          category: 'foundation',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'wearable',
          iconName: 'Moon',
        },
        {
          title: 'Technical Reading / Architecture',
          category: 'skills',
          points: 30,
          frequency: 'daily',
          weeklyTargetDays: 6,
          weeklyPoints: 180,
          verificationType: 'manual',
          iconName: 'BookOpen',
        },
        {
          title: 'Evening Physical Recovery / Foam Roll',
          category: 'physical',
          points: 25,
          frequency: 'daily',
          weeklyTargetDays: 7,
          weeklyPoints: 175,
          verificationType: 'photo',
          iconName: 'Activity',
        },
        {
          title: 'Weekly Hardware / Workshop Sprint',
          category: 'deep_work',
          points: 127,
          frequency: 'weekly',
          weeklyTargetDays: 2,
          weeklyPoints: 255,
          verificationType: 'manual',
          iconName: 'Briefcase',
        },
      ],
    },
    parityProof: {
      isEqual: true,
      pointDelta: 0,
      explanation:
        'A monk-like contemplative discipline and an explosive athletic discipline hit the exact same 1,680 weekly point ceiling. Intention is what is being measured and competed over.',
    },
  },
];

// ============================================================================
// 5. UNCHEATABLE PROOF & HARDWARE INTEGRATION
// ============================================================================

export const VERIFICATION_FEATURES: VerificationFeature[] = [
  {
    id: 'photo-proof',
    title: 'Client-Compressed Photo Proof',
    badge: 'Zero-Leak Privacy',
    category: 'camera',
    summary: 'Visual confirmation stripped of EXIF metadata before network egress.',
    technicalDetail:
      'Photos are downsampled on-device to high-efficiency WebP/JPEG, stripped of EXIF metadata (GPS coordinates and camera serial numbers), and uploaded directly to encrypted tenant storage. Your partner sees your proof in the shared feed; third-party ad networks see nothing.',
  },
  {
    id: 'wearable-telemetry',
    title: 'Biometric Wearable Telemetry',
    badge: 'Zero-Click Automation',
    category: 'wearable',
    summary: 'Direct reconciliation with Apple Health, Garmin, Oura, and Strava.',
    technicalDetail:
      'Habits bound to wearable automation evaluate actual physiological records (sleep minutes, active workout heart rate, daily step totals) via OAuth 2.0 and native HealthKit bridges. Manual check-ins maintain precedence while automated rollups enforce session minimums.',
    supportedIntegrations: ['Apple Health / HealthKit', 'Garmin Connect', 'Oura Ring Gen 3', 'Strava', 'Google Health Connect'],
  },
  {
    id: 'idempotent-constraints',
    title: 'Cryptographic & Database Idempotence',
    badge: 'PostgreSQL RLS',
    category: 'cryptography',
    summary: 'Duplicate check-ins and retroactive tampering are mathematically impossible.',
    technicalDetail:
      'Every check-in is bound to a strict composite constraint (duel_id, habit_id, civil_date). Offline check-ins reconcile deterministically using monotonic vector clocks. You cannot check in twice for the same day, and you cannot inject points into past weeks.',
  },
];

// ============================================================================
// 6. STAKES & SUNDAY MIDNIGHT SETTLEMENT
// ============================================================================

export const SETTLEMENT_SYSTEM: SettlementMechanism = {
  id: 'sunday-midnight',
  name: 'Sunday Midnight Settlement',
  ceremonyName: 'The Hall of Champions',
  schedule: 'Weekly, Every Sunday at 23:59:59 Local Time',
  triggerTime: 'Sunday 23:59:59',
  description:
    'Accountability requires an inevitable conclusion. At Sunday midnight, the weekly leaderboard locks permanently, calculates the winner, records the outcome in the immutable Hall of Champions ledger, and resets active scores to zero for the new week.',
  rules: [
    'The Player with the higher weekly point total claims the agreed stake.',
    'In the event of an exact tie, the stake rolls over to double the stakes for the following week, or is declared a mutual draw.',
    'Settled stakes are permanently stamped into the Duel ledger with the final point spread and date.',
    'Leaderboard scores reset to zero at 00:00:00 Monday. Lifetime Karma remains untouched.',
  ],
  curatedStakes: [
    {
      title: 'The Sunday Dinner Date',
      category: 'ritual',
      commitment: 'The loser reserves and pays for a full dinner at the winner’s chosen restaurant.',
    },
    {
      title: 'The Weekend Domestic Forfeit',
      category: 'forfeit',
      commitment: 'The loser assumes all kitchen and laundry duties for the entire upcoming weekend.',
    },
    {
      title: 'The Curated Book Exchange',
      category: 'experience',
      commitment: 'The winner picks a book of their choice; the loser purchases it and reads the first 100 pages.',
    },
    {
      title: 'The Hand-Written Letter of Concession',
      category: 'ritual',
      commitment: 'A handwritten letter detailing three specific qualities of discipline admired in the winner.',
    },
    {
      title: 'The Cold Plunge / Morning Coffee Run',
      category: 'forfeit',
      commitment: 'The loser delivers artisanal morning coffee and fresh pastry to the winner in bed for three consecutive mornings.',
    },
  ],
};

// ============================================================================
// 7. PERMANENT KARMA VS. EPHEMERAL LEADERBOARDS
// ============================================================================

export const KARMA_SYSTEM: KarmaSystemContent = {
  headline: 'Karma is Forever. The Leaderboard Resets.',
  subheadline:
    'Urgency demands weekly endings. Self-respect demands decadal permanence.',
  definition:
    'Karma is the cumulative sum of all historical check-in points earned by a Player since the day their Duel began. It never resets, cannot be spent on virtual items, and cannot be wagered away.',
  contrastWithLeaderboard:
    'The weekly leaderboard creates immediate tactical tension for the Sunday stake. Karma creates long-term strategic pride: a permanent monument to every hour of sleep, every barbell lifted, and every page read.',
  permanenceRule:
    'Even if you lose three weekly duels in a row, your Karma continues to grow uninterrupted. Winning the week is about tactical discipline; accumulating Karma is about lifelong identity.',
  milestones: [
    {
      points: 1000,
      name: 'Initiate of the Covenant',
      description: 'First proof of endurance: four full weeks of calibrated daily execution.',
      badgeId: 'karma_1000',
    },
    {
      points: 5000,
      name: 'Iron Consistence',
      description: 'Over 20 weeks of unbroken discipline across all categories.',
      badgeId: 'karma_5000',
    },
    {
      points: 15000,
      name: 'Century Pillar',
      description: 'One full calendar year of unyielding two-player accountability.',
      badgeId: 'karma_15000',
    },
    {
      points: 50000,
      name: 'Unbreakable Vanguard',
      description: 'Decade-scale identity transformation witnessed by your counterpart.',
      badgeId: 'karma_50000',
    },
  ],
};

// ============================================================================
// 8. ONBOARDING WALKTHROUGH STEPS
// ============================================================================

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    stepNumber: 1,
    slug: 'initialize-duel',
    title: 'Initialize Your Duel Tenancy',
    shortTitle: 'Tenancy',
    tagline: 'Claim your isolated arena',
    instruction:
      'Create your duel with an encrypted owner account and generate a single-use cryptographic invitation link.',
    technicalMechanism:
      'Generates a 128-bit secure invite code stored in PostgreSQL with strict 1:1 foreign key relationships.',
    actorRequirement: 'solo',
    estimatedSeconds: 45,
    tips: [
      'Choose a display name your counterpart immediately recognizes.',
      'One-use invite codes expire automatically once paired.',
    ],
  },
  {
    stepNumber: 2,
    slug: 'invite-counterpart',
    title: 'Bind Your Counterpart',
    shortTitle: 'Pairing',
    tagline: 'Accountability requires two',
    instruction:
      'Send the secure invite link to your spouse, co-founder, training partner, or best friend. When they accept, your duel locks.',
    technicalMechanism:
      'Atomic Supabase handshake binds the guest account to the duel slot, initializing mutual real-time presence.',
    actorRequirement: 'bilateral',
    estimatedSeconds: 60,
    tips: [
      'Do not invite a passive acquaintance. Invite someone you respect and refuse to disappoint.',
      'Remember: your subscription covers their seat entirely.',
    ],
  },
  {
    stepNumber: 3,
    slug: 'assemble-habits',
    title: 'Assemble Asymmetric Habits',
    shortTitle: 'Habit Selection',
    tagline: 'Your lifestyle, your commitments',
    instruction:
      'Select 4–8 habits that represent genuine personal growth for your life. Your counterpart selects theirs independently.',
    technicalMechanism:
      'Curated catalog spanning Foundation, Physical, Cardio, Mind, Intellect, and Deep Work with custom habit support.',
    actorRequirement: 'solo',
    estimatedSeconds: 120,
    tips: [
      'Do not copy your partner’s list unless your lives are identical.',
      'Mix high-impact weekly habits (3–4x/week) with daily foundation anchors.',
    ],
  },
  {
    stepNumber: 4,
    slug: 'calibrate-parity',
    title: 'Calibrate to 240 Daily Par',
    shortTitle: 'Parity Calibration',
    tagline: 'Mathematical fairness confirmed',
    instruction:
      'Tap Balance Plan. Our algorithm weights point values across both players until both active plans reach identical 1,680 weekly potential.',
    technicalMechanism:
      'Dynamic integer programming optimizer balances weights within allowable bounds (5–100 pts per session).',
    actorRequirement: 'bilateral',
    estimatedSeconds: 30,
    tips: [
      'Green indicator confirms exact parity alignment.',
      'If your partner has not finished their plan yet, you can calibrate against standard 240 Par.',
    ],
  },
  {
    stepNumber: 5,
    slug: 'pledge-the-stake',
    title: 'Pledge the Sunday Stake',
    shortTitle: 'Weekly Stake',
    tagline: 'Put something tangible on the line',
    instruction:
      'Agree on the wager for Sunday midnight. Dinner, chores, an artisanal coffee run, or an honest forfeit.',
    technicalMechanism:
      'Inscribes an active Stake record scoped to the current ISO week key (e.g. 2026-W42).',
    actorRequirement: 'bilateral',
    estimatedSeconds: 60,
    tips: [
      'Choose a stake both players genuinely care about.',
      'Playful rivalry makes consistency delightful.',
    ],
  },
  {
    stepNumber: 6,
    slug: 'bind-telemetry',
    title: 'Bind Wearables & Camera Permissions',
    shortTitle: 'Proof Engine',
    tagline: 'Automate verification',
    instruction:
      'Connect Apple Health, Garmin, or Oura to automatically verify workouts and sleep, or enable quick photo verification.',
    technicalMechanism:
      'Secure on-device permission grant with local-only photo compression and EXIF metadata stripping.',
    actorRequirement: 'solo',
    estimatedSeconds: 45,
    tips: [
      'Wearable workouts automatically check off without manual tapping.',
      'Photo proof takes less than 3 seconds per completion.',
    ],
  },
];

// ============================================================================
// 9. PRICING & SUBSCRIPTION SPECIFICATION
// Fair, honest, duo-seat architecture
// ============================================================================

export const PRICING_SPECIFICATION: PricingSpecification = {
  headline: 'One subscription. Two players.',
  subheadline:
    'No separate seat upgrades. No guest surcharges. No ads. Just two people committed to the work.',
  pairModelClarification:
    'One player subscribes; both players receive full, uninhibited access to the Duel for as long as the subscription remains active.',
  trialPolicy:
    'No free trial is currently offered. Stripe shows the charge before purchase.',
  guaranteeNotice:
    'Manage your subscription and cancellation in the Stripe customer portal.',
  // Purchasable plans come from /api/billing/plans, never proposed amounts.
  plans: [],
  commitments: [
    'No paywalls between partners: the paying member covers the duel.',
    'No automatic price hikes or hidden checkout add-ons.',
    'Cancel anytime: your historical data and Karma remain exportable.',
    'Local-first privacy: your health data is never sold to brokers.',
  ],
};

// ============================================================================
// 10. COMPREHENSIVE FAQ
// Direct, intellectually honest, unslopped answers
// ============================================================================

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'why-two-players-only',
    category: 'philosophy',
    question: 'Why only two players? Can we add a third or fourth friend?',
    answer:
      'No. The architecture is deliberately, permanently restricted to two players. In behavioural psychology, groups of three or more suffer from the Ringelmann effect (social loafing): responsibility diffuses, quiet dropouts go unnoticed, and competition becomes muddy. A two-player duel is intimate and unescapable. If your partner completes their habits and you do not, there is nowhere to hide.',
    footNote: 'For teams or larger groups, traditional workplace productivity software is a better fit.',
  },
  {
    id: 'how-parity-balances-different-lives',
    category: 'parity',
    question: 'How can a marathon runner and a software engineer compete fairly?',
    answer:
      'Through our Equivalent Habit Engine calibrated to 240 Daily Par (1,680 weekly potential). We do not measure raw physical outputs against each other; we measure the execution of disciplined commitments. If the marathoner commits to 4 runs per week and the software engineer commits to 4 deep-work sessions per week, our engine assigns both routines identical mathematical weight. Winning requires completing 100% of your chosen commitments, not matching your partner’s biometrics.',
  },
  {
    id: 'can-my-partner-cheat',
    category: 'fairness',
    question: 'What stops my partner from lying and checking off habits from bed?',
    answer:
      'Two structural safeguards: Proof and Human Accountability. First, habits can require photo proof or automated wearable telemetry (Apple Health, Garmin, Oura). Photos are compressed and sent directly to the shared activity feed for your inspection. Second, Do It is designed for two people who know and respect each other. If someone cheats their closest friend for a fake leaderboard score, the problem is not software.',
  },
  {
    id: 'how-does-subscription-cover-both',
    category: 'subscription',
    question: 'Does my partner need to buy a separate subscription?',
    answer:
      'No. The Duel owner manages one subscription for both players. Your existing habits and history remain accessible during the billing rollout.',
    footNote: 'If the owner cancels, the duel remains active until the end of the paid billing period.',
  },
  {
    id: 'what-happens-when-someone-gets-sick',
    category: 'fairness',
    question: 'What happens if one of us gets injured, sick, or travels?',
    answer:
      'Do It includes explicit Rest Days. A Rest Day preserves your active streak without generating artificial points on the leaderboard. If a major life event occurs, both players can agree to roll over the week’s stake into a mutual tie without penalty.',
  },
  {
    id: 'is-our-health-data-private',
    category: 'hardware',
    question: 'What happens to our photos and wearable telemetry data?',
    answer:
      'Your privacy is guarded at the architecture level. Photos are downsampled on your device, stripped of EXIF metadata (GPS coordinates, timestamp details, camera model), and encrypted in transit. We do not sell health data, we do not train third-party machine learning models on your logs, and we run zero advertising trackers.',
  },
  {
    id: 'can-we-change-habits-mid-week',
    category: 'parity',
    question: 'Can we change our habits or adjust points in the middle of a week?',
    answer:
      'You can edit habits at any time, but altering active point totals mid-week prompts a re-balancing warning. To prevent opportunistic point inflation during a close race, point modifications require mutual visibility in the activity feed, and previous days’ check-in values remain immutably anchored.',
  },
  {
    id: 'what-is-the-hall-of-champions',
    category: 'philosophy',
    question: 'What is the Hall of Champions?',
    answer:
      'The Hall of Champions is the permanent historical ledger of your Duel. Every Sunday at midnight, the active week closes, records the final score spread, marks whether the stake was claimed or drawn, and files a permanent chapter in your joint archive. You can look back on months of rivalry and see exactly when each of you peaked.',
  },
];

// ============================================================================
// 11. QUICK SUMMARY EXPORTS & HELPER UTILITIES
// ============================================================================

export interface OnboardingContentPackage {
  hero: HeroContent;
  domainConcepts: DomainConcept[];
  manifesto: AntiFreemiumManifesto;
  parityExplanation: typeof PARITY_ENGINE_EXPLANATION;
  simulatorPresets: ParityPreset[];
  verificationFeatures: VerificationFeature[];
  settlementSystem: SettlementMechanism;
  karmaSystem: KarmaSystemContent;
  onboardingSteps: OnboardingStep[];
  pricing: PricingSpecification;
  faq: FaqItem[];
}

export const ONBOARDING_CONTENT: OnboardingContentPackage = {
  hero: HERO_CONTENT,
  domainConcepts: DOMAIN_CONCEPTS,
  manifesto: MANIFESTO,
  parityExplanation: PARITY_ENGINE_EXPLANATION,
  simulatorPresets: SIMULATOR_PRESETS,
  verificationFeatures: VERIFICATION_FEATURES,
  settlementSystem: SETTLEMENT_SYSTEM,
  karmaSystem: KARMA_SYSTEM,
  onboardingSteps: ONBOARDING_STEPS,
  pricing: PRICING_SPECIFICATION,
  faq: FAQ_ITEMS,
};

export function getPresetById(presetId: string): ParityPreset | undefined {
  return SIMULATOR_PRESETS.find(preset => preset.id === presetId);
}

export function getDomainConceptById(conceptId: string): DomainConcept | undefined {
  return DOMAIN_CONCEPTS.find(concept => concept.id === conceptId);
}

export function getFaqItemsByCategory(category: FaqCategory): FaqItem[] {
  return FAQ_ITEMS.filter(item => item.category === category);
}

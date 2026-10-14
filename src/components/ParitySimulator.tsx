'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Laptop,
  Moon,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Trophy,
  Users,
  Utensils,
  Watch,
  X,
  Zap,
} from 'lucide-react';

export const DAILY_PAR_CEILING = 240;

export interface HabitProofInfo {
  deviceOrSource: string;
  metricPrimary: string;
  timestamp: string;
  verificationCode: string;
  notes: string;
  type: 'telemetry' | 'photo';
  sensorDetails?: {
    avgHr?: string;
    distance?: string;
    cadenceOrPace?: string;
    calories?: string;
    exifModel?: string;
    geoAccuracy?: string;
  };
}

export interface SimulatorHabit {
  id: string;
  title: string;
  points: number;
  category: 'foundation' | 'physical' | 'deep_work' | 'mind' | 'intellect' | 'nutrition';
  iconType: 'sunrise' | 'dumbbell' | 'book' | 'laptop' | 'run' | 'nutrition' | 'yoga' | 'sleep' | 'steps' | 'breath';
  proof: HabitProofInfo;
}

export interface SimulatorPlayer {
  id: 'player_a' | 'player_b';
  name: string;
  tagline: string;
  avatarInitials: string;
  accentHex: string;
  habits: SimulatorHabit[];
}

export interface SimulatorPreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  stakeTitle: string;
  stakeWager: string;
  playerA: SimulatorPlayer;
  playerB: SimulatorPlayer;
  defaultCheckedA: string[];
  defaultCheckedB: string[];
}

export const PRESET_SCENARIOS: SimulatorPreset[] = [
  {
    id: 'morning_athletes',
    name: 'Morning Athletes',
    tagline: 'Strength & Cold Discipline vs. Endurance & Mobility',
    description: 'Two athletes with completely contrasting training philosophies competing under an identical 240 Par daily quota.',
    stakeTitle: 'Sunday Omakase & Wine at Osteria',
    stakeWager: 'Lowest aggregate score on Sunday evening covers the tasting menu bill.',
    playerA: {
      id: 'player_a',
      name: 'Alex',
      tagline: 'Powerlifting & Cold Immersion',
      avatarInitials: 'AL',
      accentHex: '#38bdf8', // Sky 400
      habits: [
        {
          id: 'ma-a-1',
          title: 'Early Rise 06:00 AM',
          points: 30,
          category: 'foundation',
          iconType: 'sunrise',
          proof: {
            type: 'photo',
            deviceOrSource: 'iPhone 16 Pro • Camera API',
            metricPrimary: 'EXIF 06:02:14 AM CEST',
            timestamp: '06:02 AM',
            verificationCode: 'EXIF-GEO-VERIFIED #9182',
            notes: 'Geotagged morning balcony snapshot with natural sunlight validation.',
            sensorDetails: { exifModel: 'iPhone 16 Pro (f/1.78, 24mm)', geoAccuracy: '±3m radius' },
          },
        },
        {
          id: 'ma-a-2',
          title: 'Heavy Barbell Strength (75m)',
          points: 60,
          category: 'physical',
          iconType: 'dumbbell',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Apple Watch Ultra 2',
            metricPrimary: '144 bpm avg HR • 520 kcal',
            timestamp: '07:35 AM',
            verificationCode: 'HEALTHKIT-WORKOUT #8831',
            notes: 'Functional strength training session streamed via Apple HealthKit.',
            sensorDetails: { avgHr: '144 bpm (peak 172)', calories: '520 active kcal', cadenceOrPace: '75 min duration' },
          },
        },
        {
          id: 'ma-a-3',
          title: 'Cold Immersion 3 Min',
          points: 20,
          category: 'physical',
          iconType: 'run',
          proof: {
            type: 'photo',
            deviceOrSource: 'Leica Q3 • Photo Verification',
            metricPrimary: 'Water Temp 4.8°C • 03:12',
            timestamp: '08:50 AM',
            verificationCode: 'COLD-TIMER #4902',
            notes: 'Stopwatch timestamped plunge verified against session metadata.',
            sensorDetails: { exifModel: 'Leica Q3 (28mm Summilux)', geoAccuracy: 'Verified' },
          },
        },
        {
          id: 'ma-a-4',
          title: 'Deep Work 3 Hours (Architecture)',
          points: 80,
          category: 'deep_work',
          iconType: 'laptop',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'RescueTime & VS Code Telemetry',
            metricPrimary: '184 min uninterrupted focus',
            timestamp: '01:15 PM',
            verificationCode: 'SHA-FOCUS #2290',
            notes: 'Zero contextual switching across coding and schema documentation.',
            sensorDetails: { cadenceOrPace: '98% productive score', calories: '0 distraction flags' },
          },
        },
        {
          id: 'ma-a-5',
          title: '20 Pages Non-Fiction',
          points: 50,
          category: 'intellect',
          iconType: 'book',
          proof: {
            type: 'photo',
            deviceOrSource: 'Do It In-App Camera',
            metricPrimary: 'Pages 142 - 164 verified',
            timestamp: '09:30 PM',
            verificationCode: 'OCR-READING #7142',
            notes: 'High-resolution capture of annotated margins and bookmark placement.',
            sensorDetails: { exifModel: 'Do It Secure Camera Sandbox' },
          },
        },
      ],
    },
    playerB: {
      id: 'player_b',
      name: 'Jordan',
      tagline: 'Endurance & Mobility',
      avatarInitials: 'JO',
      accentHex: '#f43f5e', // Rose 500
      habits: [
        {
          id: 'ma-b-1',
          title: '10km Tempo Run (Sub-50m)',
          points: 80,
          category: 'physical',
          iconType: 'run',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Garmin Forerunner 965',
            metricPrimary: '10.21 km • 4:48/km • 690 kcal',
            timestamp: '06:45 AM',
            verificationCode: 'GARMIN-FIT-SYNC #1049',
            notes: 'Raw GPS track and biometric stream synced over official Garmin Connect API.',
            sensorDetails: { avgHr: '158 bpm avg', distance: '10.21 km', cadenceOrPace: '178 spm • 4:48/km', calories: '690 kcal' },
          },
        },
        {
          id: 'ma-b-2',
          title: 'Mobility & Vinyasa Flow (40m)',
          points: 40,
          category: 'mind',
          iconType: 'yoga',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Whoop 4.0 Strap',
            metricPrimary: '42 min • Strain 8.4',
            timestamp: '08:15 AM',
            verificationCode: 'WHOOP-RECOVERY #3391',
            notes: 'Restorative hip and spine mobility session recorded via Whoop.',
            sensorDetails: { avgHr: '102 bpm', calories: '185 active kcal' },
          },
        },
        {
          id: 'ma-b-3',
          title: 'Anti-Inflammatory Fuel (Whole Foods)',
          points: 40,
          category: 'nutrition',
          iconType: 'nutrition',
          proof: {
            type: 'photo',
            deviceOrSource: 'Mobile Verification Lens',
            metricPrimary: '100% Organic • Zero Seed Oils',
            timestamp: '01:30 PM',
            verificationCode: 'NUTRITION-PHOTO #4410',
            notes: 'Complete meal prep snapshot with timestamped nutrient breakdown.',
          },
        },
        {
          id: 'ma-b-4',
          title: 'Language Immersion 30m',
          points: 40,
          category: 'intellect',
          iconType: 'book',
          proof: {
            type: 'photo',
            deviceOrSource: 'Babbel Live + Audio Timestamp',
            metricPrimary: '35 min Italian B2 conversation',
            timestamp: '06:00 PM',
            verificationCode: 'LESSON-API #8012',
            notes: 'Completed live conversational module certified with tutor signoff.',
          },
        },
        {
          id: 'ma-b-5',
          title: 'Evening Unwind & Journal',
          points: 40,
          category: 'mind',
          iconType: 'breath',
          proof: {
            type: 'photo',
            deviceOrSource: 'Do It Camera Lens',
            metricPrimary: 'Daily ledger entry stamped',
            timestamp: '10:15 PM',
            verificationCode: 'JOURNAL-EXIF #6109',
            notes: 'Handwritten physical notebook entry captured prior to bedroom lock.',
          },
        },
      ],
    },
    defaultCheckedA: ['ma-a-1', 'ma-a-2', 'ma-a-3'], // 30 + 60 + 20 = 110 pts
    defaultCheckedB: ['ma-b-1', 'ma-b-2'], // 80 + 40 = 120 pts
  },
  {
    id: 'founder_deep_work',
    name: 'Founder & Co-founder',
    tagline: 'Engineering Architecture vs. Product Discovery',
    description: 'Technical co-founder and product lead driving aggressive startup milestones with zero room for slacking.',
    stakeTitle: 'Espresso Bar Tabs & Saturday Croissant Run',
    stakeWager: 'Partner trailing on Sunday covers all artisanal coffees and morning pastries for the entire team.',
    playerA: {
      id: 'player_a',
      name: 'David',
      tagline: 'Technical Architecture & Deep Code',
      avatarInitials: 'DA',
      accentHex: '#818cf8', // Indigo 400
      habits: [
        {
          id: 'fd-a-1',
          title: 'Core Architecture Deep Block (4h)',
          points: 90,
          category: 'deep_work',
          iconType: 'laptop',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'GitHub Enterprise Audit',
            metricPrimary: '4h 12m active IDE session',
            timestamp: '01:45 PM',
            verificationCode: 'GIT-SHA-256 #a8f4c1',
            notes: '4 clean PRs submitted, zero context interruption or browser tab wander.',
            sensorDetails: { cadenceOrPace: '240 min clocked', calories: '99% focus rating' },
          },
        },
        {
          id: 'fd-a-2',
          title: 'Code Review & Security Audit',
          points: 40,
          category: 'deep_work',
          iconType: 'laptop',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Linear & GitHub API',
            metricPrimary: '8 PRs reviewed w/ test coverage',
            timestamp: '03:30 PM',
            verificationCode: 'PR-AUDIT #1904',
            notes: 'Peer-reviewed critical payment gateway migrations.',
          },
        },
        {
          id: 'fd-a-3',
          title: 'Intermittent Fasting (16:8 Protocol)',
          points: 30,
          category: 'nutrition',
          iconType: 'nutrition',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Zero Fasting API',
            metricPrimary: '16h 40m completed fast',
            timestamp: '12:00 PM',
            verificationCode: 'ZERO-FAST #9921',
            notes: 'Metabolic fast verified through connected tracker.',
          },
        },
        {
          id: 'fd-a-4',
          title: 'Zone 2 Cardio Base (45m)',
          points: 50,
          category: 'physical',
          iconType: 'run',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Garmin Edge / HR Monitor',
            metricPrimary: '132 bpm steady state • 440 kcal',
            timestamp: '06:10 PM',
            verificationCode: 'GARMIN-HR-Z2 #5821',
            notes: 'Optimal mitochondrial aerobic baseline maintained in strict Zone 2.',
            sensorDetails: { avgHr: '132 bpm', calories: '440 kcal' },
          },
        },
        {
          id: 'fd-a-5',
          title: 'Zero Inbox & Standup Clearance',
          points: 30,
          category: 'foundation',
          iconType: 'sunrise',
          proof: {
            type: 'photo',
            deviceOrSource: 'Superhuman Screen Capture',
            metricPrimary: '0 unread threads @ 18:00',
            timestamp: '06:00 PM',
            verificationCode: 'ZERO-INBOX #3021',
            notes: 'Clean slate inbox zero state confirmed with unread counter zero.',
          },
        },
      ],
    },
    playerB: {
      id: 'player_b',
      name: 'Elena',
      tagline: 'Product Strategy & Customer Interviews',
      avatarInitials: 'EL',
      accentHex: '#34d399', // Emerald 400
      habits: [
        {
          id: 'fd-b-1',
          title: 'Product PRD Specs Drafting (3h)',
          points: 80,
          category: 'deep_work',
          iconType: 'laptop',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Notion Workspace Audit',
            metricPrimary: '185 min focused spec authoring',
            timestamp: '11:30 AM',
            verificationCode: 'NOTION-TIME #4418',
            notes: 'Complete Q4 roadmap specs finalized with interactive flow wireframes.',
          },
        },
        {
          id: 'fd-b-2',
          title: '3 Customer Discovery Interviews',
          points: 60,
          category: 'intellect',
          iconType: 'book',
          proof: {
            type: 'photo',
            deviceOrSource: 'Grain AI / Zoom Telemetry',
            metricPrimary: '3 enterprise interviews + synthesis',
            timestamp: '03:15 PM',
            verificationCode: 'GRAIN-INTERVIEW #9201',
            notes: 'Recorded customer transcripts synthesized into prioritized linear issues.',
          },
        },
        {
          id: 'fd-b-3',
          title: 'Strength & Functional Conditioning',
          points: 50,
          category: 'physical',
          iconType: 'dumbbell',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Apple Watch Series 10',
            metricPrimary: '50 min • 380 active kcal',
            timestamp: '05:30 PM',
            verificationCode: 'HEALTH-STRENGTH #7741',
            notes: 'Full body functional circuit verified via HealthKit.',
            sensorDetails: { avgHr: '138 bpm', calories: '380 kcal' },
          },
        },
        {
          id: 'fd-b-4',
          title: 'Technical Whitepaper Reading 45m',
          points: 25,
          category: 'intellect',
          iconType: 'book',
          proof: {
            type: 'photo',
            deviceOrSource: 'Readwise Reader API',
            metricPrimary: '24 highlights synced to Obsidian',
            timestamp: '08:45 PM',
            verificationCode: 'READWISE-SYNC #6122',
            notes: 'Deep dive into distributed systems papers with synchronized highlights.',
          },
        },
        {
          id: 'fd-b-5',
          title: 'Digital Sunset (Screens Off 21:30)',
          points: 25,
          category: 'foundation',
          iconType: 'sleep',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'iOS Screen Time API',
            metricPrimary: 'Zero display unlocks after 21:30',
            timestamp: '09:30 PM',
            verificationCode: 'DOWNTIME-LOCK #0042',
            notes: 'Hardware lock enforced via iOS Downtime API.',
          },
        },
      ],
    },
    defaultCheckedA: ['fd-a-1', 'fd-a-3', 'fd-a-4'], // 90 + 30 + 50 = 170 pts
    defaultCheckedB: ['fd-b-1', 'fd-b-2'], // 80 + 60 = 140 pts
  },
  {
    id: 'couples_wellness',
    name: 'Discipline & Recovery',
    tagline: 'Circadian Performance vs. Daily Balance & Mindset',
    description: 'A couple synchronizing healthy habits while maintaining radically customized personal routines.',
    stakeTitle: 'Michelin Star Dinner & Housekeeper Handover',
    stakeWager: 'The partner with fewer points by Sunday night funds dinner and assumes full weekend cleanup.',
    playerA: {
      id: 'player_a',
      name: 'Marcus',
      tagline: 'Circadian Rhythm & High Output',
      avatarInitials: 'MA',
      accentHex: '#fbbf24', // Amber 400
      habits: [
        {
          id: 'cw-a-1',
          title: 'Wake 06:30 + Sunlight Protocol',
          points: 30,
          category: 'foundation',
          iconType: 'sunrise',
          proof: {
            type: 'photo',
            deviceOrSource: 'Do It Verification Camera',
            metricPrimary: 'Lux meter 12,000+ lux @ 06:38 AM',
            timestamp: '06:38 AM',
            verificationCode: 'SOLAR-EXIF #1009',
            notes: 'Direct optic sunlight protocol documented within 15 minutes of waking.',
            sensorDetails: { exifModel: 'Do It Solar Sync Engine' },
          },
        },
        {
          id: 'cw-a-2',
          title: 'Kettlebell Complex & Rucking (50m)',
          points: 60,
          category: 'physical',
          iconType: 'dumbbell',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Garmin Tactix 7',
            metricPrimary: '24kg ruck • 5.4 km • 490 kcal',
            timestamp: '07:45 AM',
            verificationCode: 'GARMIN-RUCK #7821',
            notes: 'Weighted vest endurance session logged with elevation profile.',
            sensorDetails: { avgHr: '141 bpm', distance: '5.4 km', calories: '490 kcal' },
          },
        },
        {
          id: 'cw-a-3',
          title: 'Sugar-Free Clean Macro Intake',
          points: 40,
          category: 'nutrition',
          iconType: 'nutrition',
          proof: {
            type: 'photo',
            deviceOrSource: 'Nutritional Macro Lens',
            metricPrimary: '0g refined sugar • 180g protein',
            timestamp: '07:00 PM',
            verificationCode: 'CLEAN-MACRO #2841',
            notes: 'Daily nutritional compliance log verified.',
          },
        },
        {
          id: 'cw-a-4',
          title: 'Box Breathing & Meditation (20m)',
          points: 30,
          category: 'mind',
          iconType: 'breath',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Oura Ring Gen 3',
            metricPrimary: '20 min • HRV drop + calm state',
            timestamp: '08:30 PM',
            verificationCode: 'OURA-MIND #6620',
            notes: 'Parasympathetic tone activation tracked via skin temp and HRV delta.',
          },
        },
        {
          id: 'cw-a-5',
          title: '8 Hours Circadian Sleep Parity',
          points: 80,
          category: 'foundation',
          iconType: 'sleep',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Eight Sleep Pod 4',
            metricPrimary: '8h 14m sleep • 92 Sleep Fitness',
            timestamp: '06:30 AM',
            verificationCode: 'EIGHT-SLEEP #9011',
            notes: 'Full overnight hypnogram: 2h 10m deep sleep, 1h 55m REM.',
            sensorDetails: { cadenceOrPace: '8h 14m total', avgHr: '48 bpm resting HR' },
          },
        },
      ],
    },
    playerB: {
      id: 'player_b',
      name: 'Sofia',
      tagline: 'Vitality, Movement & Mindfulness',
      avatarInitials: 'SO',
      accentHex: '#a78bfa', // Violet 400
      habits: [
        {
          id: 'cw-b-1',
          title: '10,000 Verified Steps',
          points: 50,
          category: 'physical',
          iconType: 'steps',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Apple Health Pedometer',
            metricPrimary: '10,480 steps • 7.8 km',
            timestamp: '06:15 PM',
            verificationCode: 'HEALTH-PEDO #3819',
            notes: 'Continuous non-vehicular step count streamed via M-series coprocessor.',
            sensorDetails: { distance: '7.8 km', cadenceOrPace: '10,480 total steps' },
          },
        },
        {
          id: 'cw-b-2',
          title: 'Reformer Pilates / Core Flow (50m)',
          points: 60,
          category: 'physical',
          iconType: 'yoga',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Whoop 4.0 Activity',
            metricPrimary: '52 min • Strain 10.8',
            timestamp: '10:00 AM',
            verificationCode: 'WHOOP-PILATES #4928',
            notes: 'Targeted core isometric resistance flow recorded with studio beacon.',
            sensorDetails: { avgHr: '124 bpm', calories: '310 kcal' },
          },
        },
        {
          id: 'cw-b-3',
          title: '3 Liters Mineral Hydration',
          points: 30,
          category: 'nutrition',
          iconType: 'nutrition',
          proof: {
            type: 'photo',
            deviceOrSource: 'Do It Verification Camera',
            metricPrimary: 'Full 3L carafe drained',
            timestamp: '07:30 PM',
            verificationCode: 'HYDRATION-LOG #1104',
            notes: 'Electrolyte-infused water carafe emptied and logged.',
          },
        },
        {
          id: 'cw-b-4',
          title: 'Paperback Reading & Reflection (45m)',
          points: 40,
          category: 'intellect',
          iconType: 'book',
          proof: {
            type: 'photo',
            deviceOrSource: 'Do It In-App Camera',
            metricPrimary: 'Philosophy text + notes',
            timestamp: '09:15 PM',
            verificationCode: 'READ-PHOTO #5501',
            notes: 'Tangible physical book reading session with handwritten margins.',
          },
        },
        {
          id: 'cw-b-5',
          title: '8 Hours Restorative Recovery Sleep',
          points: 60,
          category: 'foundation',
          iconType: 'sleep',
          proof: {
            type: 'telemetry',
            deviceOrSource: 'Oura Ring Gen 3',
            metricPrimary: '8h 05m • Oura Readiness 89',
            timestamp: '06:45 AM',
            verificationCode: 'OURA-SLEEP #7109',
            notes: 'Sleep score 89 with lowest resting heart rate of 51 bpm at 03:20 AM.',
            sensorDetails: { avgHr: '51 bpm resting HR', cadenceOrPace: '8h 05m duration' },
          },
        },
      ],
    },
    defaultCheckedA: ['cw-a-1', 'cw-a-2', 'cw-a-5'], // 30 + 60 + 80 = 170 pts
    defaultCheckedB: ['cw-b-1', 'cw-b-2', 'cw-b-5'], // 50 + 60 + 60 = 170 pts (Tie!)
  },
];

function renderHabitIcon(type: SimulatorHabit['iconType'], className = 'w-4 h-4') {
  switch (type) {
    case 'sunrise':
      return <Sunrise className={className} />;
    case 'dumbbell':
      return <Dumbbell className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    case 'laptop':
      return <Laptop className={className} />;
    case 'run':
      return <Flame className={className} />;
    case 'nutrition':
      return <Utensils className={className} />;
    case 'yoga':
      return <HeartPulse className={className} />;
    case 'sleep':
      return <Moon className={className} />;
    case 'steps':
      return <Activity className={className} />;
    case 'breath':
      return <Zap className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export function ParitySimulator() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PRESET_SCENARIOS[0].id);
  const [activePreset, setActivePreset] = useState<SimulatorPreset>(PRESET_SCENARIOS[0]);

  // Checked habit IDs per player
  const [checkedA, setCheckedA] = useState<Set<string>>(() => new Set(PRESET_SCENARIOS[0].defaultCheckedA));
  const [checkedB, setCheckedB] = useState<Set<string>>(() => new Set(PRESET_SCENARIOS[0].defaultCheckedB));

  // Proof inspection modal
  const [inspectingProof, setInspectingProof] = useState<{
    habit: SimulatorHabit;
    player: SimulatorPlayer;
    isChecked: boolean;
  } | null>(null);

  // Master telemetry badges overlay toggle
  const [showProofBadges, setShowProofBadges] = useState(true);

  // Switch preset
  const handleSelectPreset = useCallback((presetId: string) => {
    const next = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (!next) return;
    setSelectedPresetId(presetId);
    setActivePreset(next);
    setCheckedA(new Set(next.defaultCheckedA));
    setCheckedB(new Set(next.defaultCheckedB));
  }, []);

  // Toggle habit check-in for Player A
  const toggleHabitA = useCallback((habitId: string) => {
    setCheckedA((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  }, []);

  // Toggle habit check-in for Player B
  const toggleHabitB = useCallback((habitId: string) => {
    setCheckedB((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  }, []);

  // Quick actions
  const handleReset = useCallback(() => {
    setCheckedA(new Set());
    setCheckedB(new Set());
  }, []);

  const handleSimulateMaxPar = useCallback(() => {
    setCheckedA(new Set(activePreset.playerA.habits.map((h) => h.id)));
    setCheckedB(new Set(activePreset.playerB.habits.map((h) => h.id)));
  }, [activePreset]);

  const handleSimulateDeadHeat = useCallback(() => {
    // Check habits that sum closest to identical points
    const halfA = activePreset.playerA.habits.slice(0, 3).map((h) => h.id);
    const halfB = activePreset.playerB.habits.slice(0, 3).map((h) => h.id);
    setCheckedA(new Set(halfA));
    setCheckedB(new Set(halfB));
  }, [activePreset]);

  // Scores
  const scoreA = useMemo(() => {
    return activePreset.playerA.habits.reduce((acc, h) => (checkedA.has(h.id) ? acc + h.points : acc), 0);
  }, [activePreset, checkedA]);

  const scoreB = useMemo(() => {
    return activePreset.playerB.habits.reduce((acc, h) => (checkedB.has(h.id) ? acc + h.points : acc), 0);
  }, [activePreset, checkedB]);

  const totalPossibleA = useMemo(() => {
    return activePreset.playerA.habits.reduce((acc, h) => acc + h.points, 0);
  }, [activePreset]);

  const totalPossibleB = useMemo(() => {
    return activePreset.playerB.habits.reduce((acc, h) => acc + h.points, 0);
  }, [activePreset]);

  const delta = scoreA - scoreB;
  const isParA = scoreA >= DAILY_PAR_CEILING;
  const isParB = scoreB >= DAILY_PAR_CEILING;

  // Percentage calculations
  const pctA = Math.min(100, Math.round((scoreA / DAILY_PAR_CEILING) * 100));
  const pctB = Math.min(100, Math.round((scoreB / DAILY_PAR_CEILING) * 100));

  // Stake determination
  const leaderPlayer = delta > 0 ? activePreset.playerA : delta < 0 ? activePreset.playerB : null;
  const trailingPlayer = delta > 0 ? activePreset.playerB : delta < 0 ? activePreset.playerA : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-white/20 transition-colors">
      {/* Top Banner / Simulator Header */}
      <div className="relative rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white/95 dark:bg-zinc-950/80 p-6 md:p-8 backdrop-blur-xl shadow-lg dark:shadow-2xl mb-8 overflow-hidden transition-colors">
        {/* Subtle decorative grid background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                <Scale className="w-3 h-3" />
                240 DAILY PAR ENGINE
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Interactive Simulator
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Habit Parity Balancing Engine
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Experience the core Do It mechanic: distinct habits, identical 240-point daily benchmark.
              Toggle daily check-ins below to observe real-time leaderboards, automated proof telemetry, and the live Sunday wager stake.
            </p>
          </div>

          {/* Quick controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-700 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300/80 dark:border-white/10 active:scale-[0.98] transition-all"
              aria-label="Reset all habits to unchecked"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={handleSimulateDeadHeat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-300/80 dark:border-white/10 active:scale-[0.98] transition-all"
              aria-label="Simulate realistic battle"
            >
              <Activity className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Simulate Mid-Day
            </button>
            <button
              onClick={handleSimulateMaxPar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-emerald-800 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-[0.98] transition-all"
              aria-label="Simulate perfect 240 Par day for both players"
            >
              <Award className="w-3.5 h-3.5" />
              Both Hit 240 Par
            </button>
          </div>
        </div>

        {/* Preset Selector Tabs */}
        <div className="relative z-10 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Preset Archetypes
            </span>
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showProofBadges}
                onChange={(e) => setShowProofBadges(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
              />
              Show Telemetry / Photo Badges
            </label>
          </div>

          <div
            role="tablist"
            aria-label="Preset Scenarios"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900/90 rounded-xl border border-zinc-200 dark:border-white/5"
          >
            {PRESET_SCENARIOS.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`text-left p-3 rounded-lg transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-800/90 text-zinc-950 dark:text-white border border-zinc-300/90 dark:border-white/15 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{preset.name}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">{preset.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Parity Gauge & Delta Card */}
      <section
        aria-label="Live Parity Gauge and Stake Ledger"
        className="rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-zinc-950/70 p-6 md:p-7 backdrop-blur-md shadow-md dark:shadow-xl mb-8 transition-colors"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Player A Score Column */}
          <div className="lg:col-span-3 flex flex-col items-start lg:items-start">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-black/5 dark:ring-white/10"
                style={{ backgroundColor: activePreset.playerA.accentHex }}
                aria-hidden="true"
              />
              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{activePreset.playerA.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-300/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                P1
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-zinc-950 dark:text-white">
                {scoreA}
              </span>
              <span className="text-sm font-mono text-zinc-500">
                / {DAILY_PAR_CEILING} PTS
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isParA
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 font-semibold'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                }`}
              >
                {isParA ? '✓ PAR ACHIEVED' : `${DAILY_PAR_CEILING - scoreA} pts to par`}
              </span>
              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                {pctA}%
              </span>
            </div>
          </div>

          {/* Center Tug-of-War Balance Meter & Delta */}
          <div className="lg:col-span-6 flex flex-col items-center text-center px-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 text-xs font-mono mb-3 shadow-xs">
              <Scale className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              {delta === 0 ? (
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">DEAD HEAT • TIED AT {scoreA} PTS</span>
              ) : delta > 0 ? (
                <span>
                  <strong className="text-zinc-950 dark:text-white font-semibold">{activePreset.playerA.name}</strong> leads by{' '}
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">+{delta} pts</span>
                </span>
              ) : (
                <span>
                  <strong className="text-zinc-950 dark:text-white font-semibold">{activePreset.playerB.name}</strong> leads by{' '}
                  <span className="text-rose-700 dark:text-rose-400 font-bold tabular-nums">+{Math.abs(delta)} pts</span>
                </span>
              )}
            </div>

            {/* Parity Balance Bar with Center Notch */}
            <div className="w-full relative py-2">
              {/* Dual progress bar */}
              <div className="grid grid-cols-2 gap-1.5 h-3.5 bg-zinc-100 dark:bg-zinc-900/80 rounded-full p-0.5 border border-zinc-200 dark:border-white/10 overflow-hidden shadow-inner">
                {/* Left side (Player A, fills toward center) */}
                <div className="w-full bg-zinc-200/80 dark:bg-zinc-950/80 rounded-l-full overflow-hidden flex justify-end">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${pctA}%`,
                      backgroundColor: activePreset.playerA.accentHex,
                    }}
                    role="progressbar"
                    aria-valuenow={scoreA}
                    aria-valuemin={0}
                    aria-valuemax={DAILY_PAR_CEILING}
                    aria-label={`${activePreset.playerA.name} daily par progress`}
                  />
                </div>
                {/* Right side (Player B, fills toward right) */}
                <div className="w-full bg-zinc-200/80 dark:bg-zinc-950/80 rounded-r-full overflow-hidden flex justify-start">
                  <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${pctB}%`,
                      backgroundColor: activePreset.playerB.accentHex,
                    }}
                    role="progressbar"
                    aria-valuenow={scoreB}
                    aria-valuemin={0}
                    aria-valuemax={DAILY_PAR_CEILING}
                    aria-label={`${activePreset.playerB.name} daily par progress`}
                  />
                </div>
              </div>

              {/* Ticks & Labels */}
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-1.5 px-1">
                <span>0</span>
                <span>{DAILY_PAR_CEILING} DAILY PAR TARGET</span>
                <span>0</span>
              </div>
            </div>

            {/* Micro Game Mechanic Callout */}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Both partners start with independent custom habit ladders calibrated to exactly{' '}
              <span className="text-zinc-800 dark:text-zinc-200 font-mono font-medium">240 points</span>.
            </p>
          </div>

          {/* Player B Score Column */}
          <div className="lg:col-span-3 flex flex-col items-start lg:items-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-300/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400">
                P2
              </span>
              <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">{activePreset.playerB.name}</span>
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-black/5 dark:ring-white/10"
                style={{ backgroundColor: activePreset.playerB.accentHex }}
                aria-hidden="true"
              />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm font-mono text-zinc-500">
                / {DAILY_PAR_CEILING} PTS
              </span>
              <span className="text-3xl sm:text-4xl font-mono font-bold tabular-nums text-zinc-950 dark:text-white">
                {scoreB}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                {pctB}%
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isParB
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 font-semibold'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                }`}
              >
                {isParB ? '✓ PAR ACHIEVED' : `${DAILY_PAR_CEILING - scoreB} pts to par`}
              </span>
            </div>
          </div>
        </div>

        {/* Live Stake Preview Sub-panel */}
        <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-mono font-medium uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Active Weekly Stake
              </span>
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{activePreset.stakeTitle}</h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{activePreset.stakeWager}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/80 p-3.5 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
              Current Sunday Liability
            </span>
            {trailingPlayer ? (
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {trailingPlayer.name} pays
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  (trailing by {Math.abs(delta)} pts)
                </span>
              </div>
            ) : (
              <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Equal Standings • No Deficit Wager
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Side-by-Side Two-Player Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
        {/* PLAYER A COLUMN */}
        <PlayerColumn
          player={activePreset.playerA}
          checkedHabits={checkedA}
          onToggleHabit={toggleHabitA}
          showProofBadges={showProofBadges}
          onInspectProof={(habit) =>
            setInspectingProof({
              habit,
              player: activePreset.playerA,
              isChecked: checkedA.has(habit.id),
            })
          }
          currentScore={scoreA}
          totalPossible={totalPossibleA}
        />

        {/* PLAYER B COLUMN */}
        <PlayerColumn
          player={activePreset.playerB}
          checkedHabits={checkedB}
          onToggleHabit={toggleHabitB}
          showProofBadges={showProofBadges}
          onInspectProof={(habit) =>
            setInspectingProof({
              habit,
              player: activePreset.playerB,
              isChecked: checkedB.has(habit.id),
            })
          }
          currentScore={scoreB}
          totalPossible={totalPossibleB}
        />
      </div>

      {/* Educational Game-Mechanic Footer Callout */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-zinc-950/60 p-6 backdrop-blur-sm text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed transition-colors">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 mb-1">
              Deterministic Two-Player Calibrated Parity
            </h4>
            <p>
              In conventional habit trackers, one partner completing three trivial check-ins outscores a partner completing a grueling marathon training session. Do It eliminates false parity: each habit ladder is calibrated to a hard 240 Daily Par ceiling. Whether you balance creative sprint blocks, heavy compound lifts, or foreign language immersion, difficulty is equalized at the architectural layer.
            </p>
          </div>
        </div>
      </div>

      {/* Proof Inspection Dialog Modal */}
      {inspectingProof && (
        <ProofInspectionModal
          data={inspectingProof}
          onClose={() => setInspectingProof(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-components: PlayerColumn, HabitCard, ProofModal
// ----------------------------------------------------------------------------

interface PlayerColumnProps {
  player: SimulatorPlayer;
  checkedHabits: Set<string>;
  onToggleHabit: (habitId: string) => void;
  showProofBadges: boolean;
  onInspectProof: (habit: SimulatorHabit) => void;
  currentScore: number;
  totalPossible: number;
}

function PlayerColumn({
  player,
  checkedHabits,
  onToggleHabit,
  showProofBadges,
  onInspectProof,
  currentScore,
  totalPossible,
}: PlayerColumnProps) {
  const isPar = currentScore >= DAILY_PAR_CEILING;

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-zinc-950/90 overflow-hidden shadow-sm dark:shadow-xl transition-colors">
      {/* Column Header */}
      <div className="p-5 sm:p-6 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-zinc-900/40">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs text-zinc-950 shadow-inner"
              style={{ backgroundColor: player.accentHex }}
            >
              {player.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">{player.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-300/50 dark:border-white/5">
                  Ladder: {totalPossible} pts
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{player.tagline}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-mono font-bold tabular-nums text-zinc-950 dark:text-white">
              {currentScore}{' '}
              <span className="text-xs font-normal text-zinc-500">/ {DAILY_PAR_CEILING}</span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              {checkedHabits.size} of {player.habits.length} habits done
            </div>
          </div>
        </div>

        {/* Small column progress bar */}
        <div className="w-full bg-zinc-200 dark:bg-zinc-900 rounded-full h-1.5 overflow-hidden mt-3">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${Math.min(100, Math.round((currentScore / DAILY_PAR_CEILING) * 100))}%`,
              backgroundColor: player.accentHex,
            }}
          />
        </div>
      </div>

      {/* Habit List */}
      <div className="p-4 sm:p-5 space-y-2.5 flex-1 bg-white dark:bg-zinc-950/60">
        {player.habits.map((habit) => {
          const isChecked = checkedHabits.has(habit.id);
          return (
            <div
              key={habit.id}
              className={`group relative rounded-xl border p-3.5 transition-all select-none ${
                isChecked
                  ? 'bg-emerald-50/50 dark:bg-zinc-900/90 border-emerald-300/70 dark:border-white/20 shadow-xs'
                  : 'bg-white dark:bg-zinc-900/30 border-zinc-200/80 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Checkbox & Details */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => onToggleHabit(habit.id)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      onToggleHabit(habit.id);
                    }
                  }}
                  className="flex items-start gap-3 text-left flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-white/40 rounded-lg p-0.5"
                  aria-label={`Toggle ${habit.title} (${habit.points} points)`}
                >
                  {/* Tactile check toggle */}
                  <div
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-all active:scale-[0.92] ${
                      isChecked
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-zinc-900 dark:border-white font-bold'
                        : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 text-transparent group-hover:border-zinc-400 dark:group-hover:border-zinc-500'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {renderHabitIcon(habit.iconType, 'w-3.5 h-3.5')}
                      </span>
                      <span
                        className={`text-sm font-medium transition-colors ${
                          isChecked
                            ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {habit.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-transparent">
                        {habit.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                        Target Daily
                      </span>
                    </div>
                  </div>
                </button>

                {/* Points Badge */}
                <div className="flex flex-col items-end shrink-0">
                  <span
                    className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border tabular-nums transition-colors ${
                      isChecked
                        ? 'bg-zinc-900/10 dark:bg-white/10 text-zinc-900 dark:text-white border-zinc-300 dark:border-white/20'
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/5'
                    }`}
                  >
                    +{habit.points} PTS
                  </span>
                </div>
              </div>

              {/* Simulated Proof Telemetry / Photo Badge */}
              {showProofBadges && (
                <div className="mt-2.5 pt-2 border-t border-zinc-200/80 dark:border-white/5 flex items-center justify-between text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectProof(habit);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                      isChecked
                        ? 'bg-emerald-100/70 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-200/70 dark:hover:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-white/5'
                    }`}
                    aria-label={`Inspect simulated proof for ${habit.title}`}
                  >
                    {habit.proof.type === 'telemetry' ? (
                      <Watch className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    ) : (
                      <Camera className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    )}
                    <span className="truncate max-w-[170px] sm:max-w-[210px]">
                      {isChecked ? habit.proof.metricPrimary : habit.proof.deviceOrSource}
                    </span>
                    <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                  </button>

                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                    {isChecked ? 'Verified' : 'Pending Proof'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Column Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between text-xs font-mono">
        <span className="text-zinc-500 dark:text-zinc-400">Status</span>
        <span
          className={`font-semibold ${
            isPar
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          {isPar ? '240 Par Completed' : `${DAILY_PAR_CEILING - currentScore} pts needed`}
        </span>
      </div>
    </div>
  );
}


// ----------------------------------------------------------------------------
// Modal: Proof Detail Simulator
// ----------------------------------------------------------------------------
interface ProofInspectionModalProps {
  data: {
    habit: SimulatorHabit;
    player: SimulatorPlayer;
    isChecked: boolean;
  };
  onClose: () => void;
}

function ProofInspectionModal({ data, onClose }: ProofInspectionModalProps) {
  const { habit, player, isChecked } = data;
  const { proof } = habit;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proof-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-black/5 dark:ring-white/10"
                style={{ backgroundColor: player.accentHex }}
                aria-hidden="true"
              />
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {player.name} &bull; Proof Simulation
              </span>
            </div>
            <h2 id="proof-modal-title" className="text-lg font-bold text-zinc-950 dark:text-white">
              {habit.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close proof dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4">
          {/* Verification Badge Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {isChecked ? 'Cryptographically Verified' : 'Simulated Verification Available'}
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  Source: {proof.deviceOrSource}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 border border-zinc-300/50 dark:border-white/5">
              {proof.verificationCode}
            </span>
          </div>

          {/* Primary Metric Preview Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/60 p-4">
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
              Primary Biometric / Telemetry Record
            </span>
            <div className="text-xl font-mono font-bold text-zinc-950 dark:text-white tracking-tight">
              {proof.metricPrimary}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              {proof.notes}
            </p>
          </div>

          {/* Detailed Sensor Telemetry (if available) */}
          {proof.sensorDetails && (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {proof.sensorDetails.avgHr && (
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase">Heart Rate</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 mt-0.5">{proof.sensorDetails.avgHr}</div>
                </div>
              )}
              {proof.sensorDetails.distance && (
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase">GPS Distance</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 mt-0.5">{proof.sensorDetails.distance}</div>
                </div>
              )}
              {proof.sensorDetails.calories && (
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase">Active Energy</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 mt-0.5">{proof.sensorDetails.calories}</div>
                </div>
              )}
              {proof.sensorDetails.cadenceOrPace && (
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase">Pace / Duration</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 mt-0.5">{proof.sensorDetails.cadenceOrPace}</div>
                </div>
              )}
              {proof.sensorDetails.exifModel && (
                <div className="col-span-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/5">
                  <div className="text-[10px] text-zinc-500 uppercase">Optical EXIF Hardware</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 mt-0.5">{proof.sensorDetails.exifModel}</div>
                </div>
              )}
            </div>
          )}

          {/* Timestamp details */}
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-200 dark:border-white/5">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Registered: Today @ {proof.timestamp}
            </span>
            <span>Allocated Points: +{habit.points} PTS</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-200 dark:border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-mono font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParitySimulator;

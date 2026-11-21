'use client';

// PROTOTYPE: three radically different Today layouts on the real Today route, switchable via ?variant=.
// "Current" is the production TodayView. Remove this folder once a direction wins.
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { TodayView } from '@/components/TodayView';
import { PrototypeSwitcher, prototypesEnabled } from '../PrototypeSwitcher';
import { VariantA, name as nameA } from './TodayVariantA';
import { VariantB, name as nameB } from './TodayVariantB';
import { VariantC, name as nameC } from './TodayVariantC';

export type TodayVariantProps = { onOpenHabits: () => void; onOpenDuel: () => void };

const VARIANTS = [
  { key: 'now', name: 'Current (polished)' },
  { key: 'A', name: nameA },
  { key: 'B', name: nameB },
  { key: 'C', name: nameC },
];

export function TodayPrototype(props: TodayVariantProps) {
  const searchParams = useSearchParams();
  const requested = searchParams.get('variant');
  if (!prototypesEnabled()) return <TodayView {...props} />;
  const current = VARIANTS.some(v => v.key === requested) ? requested! : 'now';
  return (
    <>
      {current === 'now' && <TodayView {...props} />}
      {current === 'A' && <VariantA {...props} />}
      {current === 'B' && <VariantB {...props} />}
      {current === 'C' && <VariantC {...props} />}
      <PrototypeSwitcher variants={VARIANTS} current={current} />
    </>
  );
}

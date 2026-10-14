import type { Metadata } from 'next';
import { DesktopWelcomePage } from '@/components/DesktopWelcomePage';

export const metadata: Metadata = {
  title: 'Do It | Better habits, built together',
  description: 'Build better habits with a friend or partner. A private two-player Duel, with one shared subscription.',
};

export default function WelcomePage() {
  return <DesktopWelcomePage />;
}

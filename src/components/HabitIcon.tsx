import React from 'react';
import {
  Moon,
  Dumbbell,
  Flame,
  Footprints,
  Sparkles,
  Sun,
  BookOpen,
  Target,
  Code,
  Briefcase,
  Globe,
  Apple,
  CheckCircle2,
  Activity,
  Heart,
  Zap,
  Coffee,
  LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Moon,
  Dumbbell,
  Flame,
  Footprints,
  Sparkles,
  Sun,
  BookOpen,
  Target,
  Code,
  Briefcase,
  Globe,
  Apple,
  CheckCircle2,
  Activity,
  Heart,
  Zap,
  Coffee,
};

export function HabitIcon({
  name,
  className = 'w-5 h-5',
}: {
  name: string;
  className?: string;
}) {
  const IconComponent = ICON_MAP[name] || Activity;
  return <IconComponent className={className} />;
}

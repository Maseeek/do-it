'use client';

import { PageRecovery } from '@/components/PageRecovery';

export default function AppError({ retry }: { retry: () => void }) {
  return <PageRecovery retry={retry} />;
}

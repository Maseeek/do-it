'use client';

import { PageRecovery } from '@/components/PageRecovery';

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <title>do: habit tracker</title>
        <PageRecovery retry={retry} />
      </body>
    </html>
  );
}

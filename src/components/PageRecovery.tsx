'use client';

import { useEffect } from 'react';
import { getTodayRecoveryUrl, recoverPageOnce } from '@/lib/page-recovery';

export function PageRecovery({ retry }: { retry: () => void }) {
  useEffect(() => {
    const recover = () => {
      if (!navigator.onLine) return;
      try {
        recoverPageOnce(window.sessionStorage, window.location.href, url => window.location.replace(url));
      } catch {
        // Some browsers deny access to sessionStorage itself.
      }
    };
    recover();
    window.addEventListener('online', recover);
    return () => window.removeEventListener('online', recover);
  }, []);

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box', background: '#08090a', color: '#f6f7fa', fontFamily: 'system-ui, sans-serif' }}>
      <section aria-labelledby="recovery-title" style={{ maxWidth: 360, textAlign: 'center' }}>
        <p aria-hidden="true" style={{ fontSize: 32, fontWeight: 700, margin: '0 0 24px' }}>do.</p>
        <h1 id="recovery-title" style={{ fontSize: 24, margin: '0 0 12px' }}>Let&apos;s get you back</h1>
        <p style={{ color: '#a1a1aa', lineHeight: 1.6, margin: '0 0 24px' }}>This page didn&apos;t finish opening. Try again, or return to Today. If you&apos;re offline, we&apos;ll try again when you reconnect.</p>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
          <button type="button" onClick={retry} style={{ minHeight: 44, padding: '10px 20px', borderRadius: 12, border: '1px solid #3f3f46', background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>Try again</button>
          <button type="button" onClick={() => window.location.replace(getTodayRecoveryUrl(window.location.href))} style={{ minHeight: 44, padding: '10px 20px', borderRadius: 12, border: 0, background: '#f6f7fa', color: '#08090a', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>Go to Today</button>
        </div>
      </section>
    </main>
  );
}

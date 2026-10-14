import Link from 'next/link';
import { BillingPanel } from '@/components/BillingPanel';

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  return <main className="w-full max-w-2xl mx-auto px-5 py-12 space-y-6">
    <Link href="/" className="text-sm text-zinc-500 hover:text-foreground">← Back to your Duel</Link>
    <BillingPanel result={result} />
  </main>;
}

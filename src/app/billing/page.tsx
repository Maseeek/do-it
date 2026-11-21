import Link from 'next/link';
import { BillingPanel } from '@/components/BillingPanel';

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  return <main className="w-full max-w-xl mx-auto px-4 py-8 lg:py-12 flex flex-col gap-4">
    <Link href="/" className="-ml-1 inline-flex min-h-11 items-center self-start px-1 text-label text-secondary hover:text-foreground">← Back to your Duel</Link>
    <BillingPanel result={result} />
  </main>;
}

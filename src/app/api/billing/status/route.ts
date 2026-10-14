import { billingConfig, billingResponseError, billingStripe, billingSummary } from '@/lib/billing-server';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const config = billingConfig();
    return Response.json(await billingSummary(request, config, billingStripe(config)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingResponseError(error); }
}

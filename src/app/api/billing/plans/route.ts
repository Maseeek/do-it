import { billingConfig, billingResponseError, billingStripe, configuredPlans } from '@/lib/billing-server';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const config = billingConfig();
    const plans = await configuredPlans(billingStripe(config), config);
    return Response.json({ testMode: !config.livemode, plans: plans.map(({ plan, label }) => ({ plan, label })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingResponseError(error); }
}

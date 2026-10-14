import { claimPurchase, purchaseBrowser, requirePurchaseOrigin } from '@/lib/billing-purchase-server';
import { billingConfig, billingResponseError, billingStripe } from '@/lib/billing-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const config = billingConfig();
    requirePurchaseOrigin(request, config);
    await claimPurchase(request, config, billingStripe(config), await purchaseBrowser(config));
    return Response.json({ claimed: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingResponseError(error); }
}

import { BillingError, checkoutInputSchema } from '@/lib/billing-model';
import { purchaseView, startPurchase } from '@/lib/billing-purchase';
import { purchaseBrowser, requirePurchaseOrigin, withPurchaseLease } from '@/lib/billing-purchase-server';
import { billingConfig, billingResponseError, billingStripe, configuredPlans, verifyBillingAccount } from '@/lib/billing-server';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const config = billingConfig();
    const stripe = billingStripe(config);
    await verifyBillingAccount(stripe, config);
    const hash = await purchaseBrowser(config, true);
    const view = await withPurchaseLease(config, stripe, hash, purchaseView);
    return Response.json(view, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingResponseError(error); }
}
export async function POST(request: Request) {
  try {
    const config = billingConfig();
    requirePurchaseOrigin(request, config);
    // Bootstrap through GET first: the browser must persist its cookie before
    // any Stripe side effect, including a request whose response is lost.
    const hash = await purchaseBrowser(config);
    const input = checkoutInputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) throw new BillingError('Choose a valid membership plan.', 400);
    const stripe = billingStripe(config);
    const plan = (await configuredPlans(stripe, config)).find(p => p.plan === input.data.plan);
    if (!plan) throw new BillingError('That membership plan is unavailable.', 400);
    const url = await withPurchaseLease(config, stripe, hash, ctx => startPurchase(ctx, plan.id));
    return Response.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return billingResponseError(error); }
}

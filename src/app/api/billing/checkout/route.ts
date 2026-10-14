import { BillingError, checkoutInputSchema, requireBillingOwner } from '@/lib/billing-model';
import { startCheckout } from '@/lib/billing-service';
import { billingConfig, billingMember, billingResponseError, billingStripe, configuredPlans, withBillingLease } from '@/lib/billing-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const config = billingConfig();
    const { user, duel } = await billingMember(request, config);
    requireBillingOwner(user.id, duel.owner_id);
    const input = checkoutInputSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) throw new BillingError('Choose a valid billing plan.', 400);
    const stripe = billingStripe(config);
    const plan = (await configuredPlans(stripe, config)).find(p => p.plan === input.data.plan);
    if (!plan) throw new BillingError('That billing plan is unavailable.', 400);
    const url = await withBillingLease(config, stripe, duel.id, duel.owner_id, ctx => startCheckout(ctx, user.id, plan.id));
    return Response.json({ url });
  } catch (error) { return billingResponseError(error); }
}

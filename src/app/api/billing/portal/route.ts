import { openPortal } from '@/lib/billing-service';
import { requireBillingOwner } from '@/lib/billing-model';
import { billingConfig, billingMember, billingResponseError, billingStripe, verifyBillingAccount, withBillingLease } from '@/lib/billing-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const config = billingConfig();
    const { user, duel } = await billingMember(request, config);
    requireBillingOwner(user.id, duel.owner_id);
    const stripe = billingStripe(config);
    await verifyBillingAccount(stripe, config);
    const url = await withBillingLease(config, stripe, duel.id, duel.owner_id, ctx => openPortal(ctx, user.id));
    return Response.json({ url });
  } catch (error) { return billingResponseError(error); }
}

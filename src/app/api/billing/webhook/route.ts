import { z } from 'zod';
import { billingConfig, billingDatabase, billingResponseError, billingStripe, verifyBillingAccount, withBillingLease } from '@/lib/billing-server';
import { billingEventCustomer, verifyBillingEvent } from '@/lib/billing-webhook';
import { reconcileBilling } from '@/lib/billing-service';
import { reconcilePurchaseEvent } from '@/lib/billing-purchase-server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const config = billingConfig();
    const stripe = billingStripe(config);
    const event = verifyBillingEvent(stripe, await request.text(), request.headers.get('stripe-signature') ?? '', config.signingSecret, config.livemode);
    // Pending Checkout may have no customer yet (including expiry events).
    await reconcilePurchaseEvent(event, stripe, config);
    const customer = billingEventCustomer(event);
    if (!customer) return Response.json({ received: true });
    const db = billingDatabase(config);
    const processed = await db.from('billing_events').select('event_id').eq('event_id', event.id).maybeSingle();
    if (processed.error) throw new Error('Webhook replay lookup failed.');
    if (processed.data) return Response.json({ received: true });
    const row = await db.from('duel_billing').select('duel_id').eq('livemode', config.livemode).eq('state->customer->>id', customer).maybeSingle();
    if (row.error) throw new Error('Webhook customer lookup failed.');
    // This account may host other products. Ignore customers never bound by
    // our server, regardless of metadata in the signed event.
    if (!row.data) return Response.json({ received: true });
    const { duel_id: duelId } = z.object({ duel_id: z.string().uuid() }).parse(row.data);
    await verifyBillingAccount(stripe, config);
    await withBillingLease(config, stripe, duelId, '', async ctx => {
      if (ctx.state.customer?.id !== customer) throw new Error('Customer binding changed.');
      await reconcileBilling(ctx);
    }, event.id);
    return Response.json({ received: true });
  } catch (error) { return billingResponseError(error); }
}

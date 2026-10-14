import Stripe from 'stripe';
import { z } from 'zod';
import { BillingError } from './billing-model';

export function verifyBillingEvent(stripe: Stripe, body: string, signature: string, secret: string, livemode: boolean) {
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(body, signature, secret); }
  catch { throw new BillingError('Invalid webhook signature.', 400); }
  if (event.livemode !== livemode) throw new BillingError('Webhook mode does not match.', 400);
  return event;
}

const customerSchema = z.object({ customer: z.union([z.string(), z.object({ id: z.string() })]) });
export function billingEventCustomer(event: Stripe.Event): string | null {
  if (!event.type.startsWith('customer.subscription.') &&
      !['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired', 'invoice.paid', 'invoice.payment_failed'].includes(event.type)) return null;
  const object = customerSchema.safeParse(event.data.object);
  if (!object.success) return null;
  return typeof object.data.customer === 'string' ? object.data.customer : object.data.customer.id;
}

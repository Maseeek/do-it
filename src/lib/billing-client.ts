'use client';

import { z } from 'zod';
import { getSupabaseClient } from './supabase';
export { purchaseViewSchema } from './billing-model';

const errorSchema = z.object({ error: z.string() });
export async function billingRequest(path: string, body?: object) {
  const { data } = await getSupabaseClient()?.auth.getSession() ?? { data: { session: null } };
  const response = await fetch(`/api/billing/${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store',
    headers: { ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json: unknown = await response.json();
  if (!response.ok) throw new Error(errorSchema.safeParse(json).data?.error ?? 'Billing is unavailable. Please retry.');
  return json;
}

export function openStripeCheckout(value: unknown) {
  const { url } = z.object({ url: z.string().url() }).parse(value);
  const target = new URL(url);
  if (target.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(target.hostname)) throw new Error('Unexpected billing destination.');
  window.location.assign(url);
}

// Run once with server credentials before applying supabase/health.sql to a deployed project.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase server credentials are required.');
const db = createClient(url, key, { auth: { persistSession: false } });
const { data: rows, error } = await db.from('oauth_tokens').select('player_id,refresh_token,access_token');
if (error) throw error;
let failures = 0;
for (const row of rows || []) {
  const token = row.refresh_token || row.access_token;
  if (!token) continue;
  const response = await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token }) });
  if (!response.ok && response.status !== 400) failures++;
}
if (failures) throw new Error(`${failures} legacy Google grants could not be revoked. Do not apply the migration yet.`);
console.log(`Processed ${(rows || []).length} legacy Google connections. Apply supabase/health.sql now.`);

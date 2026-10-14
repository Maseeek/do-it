import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

export async function createEgressFixture() {
const db = new PGlite();
const owner='11111111-1111-1111-1111-111111111111';
const guest='22222222-2222-2222-2222-222222222222';
const outsider='33333333-3333-3333-3333-333333333333';
const duel='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to authenticated,anon,service_role;
create publication supabase_realtime;
insert into auth.users values ('${owner}'),('${guest}'),('${outsider}');`);
await db.exec((await fs.readFile(new URL('duels.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;',''));
await db.exec(await fs.readFile(new URL('duels-extras.sql',import.meta.url),'utf8'));
await db.exec(`grant all on all tables in schema public to authenticated,service_role;
insert into public.duels(id,owner_id,guest_id,owner_name,guest_name) values ('${duel}','${owner}','${guest}','Owner','Guest');`);
const proof='data:image/jpeg;base64,'+'A'.repeat(240*1024);
const original={id:'check-1',habitId:'habit-1',playerId:'maciek',date:'2026-10-13',pointsEarned:20,completedAt:'2026-10-13T12:00:00Z',proofUrl:proof,proofUrls:[proof]};
await db.query(`insert into public.duel_habits values ($1,'habit-1','maciek',$2)`,[duel,{id:'habit-1',playerId:'maciek',points:20}]);
await db.query(`insert into public.duel_check_ins values ($1,'check-1','habit-1','maciek',$2)`,[duel,original]);
const migration=await fs.readFile(new URL('egress.sql',import.meta.url),'utf8');

await db.exec(migration);
return {db,owner,guest,outsider,duel,proof,original,migration};
}

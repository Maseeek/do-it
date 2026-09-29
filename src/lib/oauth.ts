import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PlayerId } from './types';

export function createOAuthState(response: NextResponse, provider: string, player: PlayerId) {
  const state = `${player}.${randomBytes(32).toString('hex')}`;
  response.cookies.set(`${provider}_oauth_state`, state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  return state;
}

export function validateOAuthState(request: NextRequest, provider: string): PlayerId | null {
  const expected = request.cookies.get(`${provider}_oauth_state`)?.value;
  const actual = request.nextUrl.searchParams.get('state');
  if (!expected || !actual || expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return null;
  const player = actual.split('.')[0];
  return player === 'maciek' || player === 'myrna' ? player : null;
}

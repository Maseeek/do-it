import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ error: 'Connect Google Health from Settings.' }, { status: 410 }); }

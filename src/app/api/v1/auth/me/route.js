import { NextResponse } from 'next/server';

export async function GET(request) {
  const sessionCookie = request.cookies.get('mars_session')?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  try {
    const user = JSON.parse(sessionCookie);
    return NextResponse.json({
      success: true,
      data: { user }
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_SESSION', message: 'Invalid session payload' } },
      { status: 401 }
    );
  }
}

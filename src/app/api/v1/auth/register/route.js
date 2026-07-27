import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, email, password, company, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Name, email and password are required.' } },
        { status: 400 }
      );
    }

    const user = {
      id: `usr-${Date.now()}`,
      name,
      email,
      company: company || 'Member',
      role: role || 'MEMBER',
      createdAt: new Date().toISOString()
    };

    const sessionPayload = JSON.stringify(user);
    const response = NextResponse.json({
      success: true,
      data: { user }
    });

    response.cookies.set('mars_session', sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

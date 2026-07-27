import { NextResponse } from 'next/server';

function mockHash(pw) {
  return `hashed-${pw}`;
}

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Email and password are required.' } },
        { status: 400 }
      );
    }

    // Default demo fallback accounts for easy testing
    let user = null;
    if (email === 'ahmed@example.com') {
      user = {
        id: 'usr-01',
        name: 'Ahmed Al-Ghamdi',
        email: 'ahmed@example.com',
        role: 'MEMBER',
        company: 'TechCorp KSA'
      };
    } else if (email === 'admin@mars.sa') {
      user = {
        id: 'usr-02',
        name: 'Sarah Al-Otaibi',
        email: 'admin@mars.sa',
        role: 'ERP_ADMIN',
        company: 'Mars Space HQ'
      };
    } else if (email === 'staff@mars.sa') {
      user = {
        id: 'usr-03',
        name: 'Omar Hassan',
        email: 'staff@mars.sa',
        role: 'STAFF',
        company: 'Mars Space Operations'
      };
    } else {
      user = {
        id: `usr-${Date.now()}`,
        name: email.split('@')[0],
        email: email,
        role: 'MEMBER',
        company: 'Individual Member'
      };
    }

    const sessionPayload = JSON.stringify(user);
    const response = NextResponse.json({
      success: true,
      data: {
        user,
        token: `session-${Date.now()}`
      }
    });

    response.cookies.set('mars_session', sessionPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
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

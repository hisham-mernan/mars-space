import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    
    // Assemble homepage content
    const homepageData = {
      branches: db.branches,
      statistics: {
        members: 642,
        companies: 184,
        events: 128,
        meetingRooms: 12,
        satisfaction: "98%"
      },
      featuredWorkspaces: db.resources.slice(0, 3),
      upcomingEvents: db.events.slice(0, 2),
      faqs: db.faqs.slice(0, 3)
    };

    return NextResponse.json({
      success: true,
      data: homepageData
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message || 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}

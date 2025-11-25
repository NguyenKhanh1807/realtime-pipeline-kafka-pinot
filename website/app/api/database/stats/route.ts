import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET() {
  try {
    // Fetch user stats
    const usersResponse = await fetch(`${BACKEND_URL}/api/transaction-users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const users = usersResponse.ok ? await usersResponse.json() : [];
    
    // Calculate statistics based on user status field
    const totalUsers = users.length || 0;
    const bannedUsers = users.filter((u: any) => u.status === 'banned').length || 0;
    const warningUsers = users.filter((u: any) => u.status === 'warning').length || 0;
    const activeBans = bannedUsers; // For backward compatibility

    // Group users by country
    const countryDistribution = users.reduce((acc: any, user: any) => {
      const country = user.country_code || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      totalUsers,
      activeBans,
      bannedUsers,
      warningUsers,
      countryDistribution,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching database stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch database stats', 
        details: error.message,
        totalUsers: 0,
        activeBans: 0,
        bannedUsers: 0,
        warningUsers: 0,
        countryDistribution: {}
      },
      { status: 500 }
    );
  }
}

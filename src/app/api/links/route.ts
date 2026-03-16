import { NextResponse } from 'next/server';

/**
 * GET /api/links
 * Retrieve all saved links
 */
export async function GET() {
  try {
    // This endpoint is meant to be used with a database in the future
    // For now, it returns a success response
    return NextResponse.json({
      success: true,
      message: 'Links endpoint. Frontend uses localStorage for now.',
      links: [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/links
 * Save a new link
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, title, description, category, creatorName, thumbnailUrl, platform } = body;

    // Validate required fields
    if (!url || !title || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: url, title, category' },
        { status: 400 }
      );
    }

    // In production, save to database here
    const newLink = {
      id: crypto.randomUUID(),
      url,
      title,
      description: description || '',
      category,
      creatorName: creatorName || 'Unknown',
      thumbnailUrl: thumbnailUrl || '',
      platform: platform || 'Web',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Link saved successfully',
      link: newLink,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save link' },
      { status: 500 }
    );
  }
}

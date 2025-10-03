import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      username,
      display_name,
      email,
      bio,
      avatar_url,
      skills,
      github_url,
      twitter_url,
      linkedin_url,
      website_url,
      role,
    } = body

    // Validate required fields
    if (!username || !display_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }

    // Create profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username,
        display_name,
        email,
        bio: bio || null,
        avatar_url: avatar_url || null,
        skills: skills || [],
        github_url: github_url || null,
        twitter_url: twitter_url || null,
        linkedin_url: linkedin_url || null,
        website_url: website_url || null,
        role: role || null,
        last_active_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile: data })
  } catch (error) {
    console.error('Error creating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
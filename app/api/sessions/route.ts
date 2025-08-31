import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, language, code } = await request.json()

    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        id: sessionId,
        user_id: userId,
        language: language || 'python',
        code: code || ''
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ session: data })

  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseServer()
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session: data })

  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}

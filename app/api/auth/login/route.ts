import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    // Clean phone number
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Get Supabase client (initialized at runtime)
    const supabase = getSupabaseServer()

    // Check if user exists
    const { data: existingUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', cleanPhone)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    let user = existingUser

    if (!existingUser) {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ 
          id: uuidv4(),
          phone_number: cleanPhone 
        }])
        .select()
        .single()

      if (createError) throw createError
      user = newUser
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

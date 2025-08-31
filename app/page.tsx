'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

// Dynamically import Monaco Editor to avoid SSR issues
const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="loading-spinner"></div></div>
})

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="loading-spinner"></div></div>
})

interface User {
  id: string
  phone_number: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showConsent, setShowConsent] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'editor' | 'dashboard'>('editor')

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
      setShowConsent(false)
    }
    
    // Generate session ID
    setSessionId(uuidv4())
  }, [])

  const handleConsentAccept = () => {
    setShowConsent(false)
  }

  const handleLogin = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter your phone number')
      return
    }

    // Simple phone number validation
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '')
    if (cleanPhone.length < 10) {
      alert('Please enter a valid phone number')
      return
    }

    setIsLoading(true)

    try {
      // Check if user exists
      let { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', cleanPhone)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

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
        existingUser = newUser
      }

      // Save user to localStorage and state
      localStorage.setItem('user', JSON.stringify(existingUser))
      setUser(existingUser)

      // Create a new session
      await supabase
        .from('sessions')
        .insert([{
          id: sessionId,
          user_id: existingUser.id,
          language: 'python',
          code: ''
        }])

    } catch (error) {
      console.error('Login error:', error)
      alert('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setPhoneNumber('')
    setSessionId(uuidv4())
  }

  if (showConsent) {
    return (
      <div className="consent-banner">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Data Collection Consent</h2>
          <p className="mb-4">
            This platform collects keystroke data including typing patterns, timing, and code snapshots 
            for research purposes. Your coding session data will be stored and analyzed to improve 
            programming education and research.
          </p>
          <p className="mb-6">
            By continuing, you consent to this data collection.
          </p>
          <button 
            onClick={handleConsentAccept}
            className="button-primary mr-4"
          >
            I Consent & Continue
          </button>
          <button 
            onClick={() => window.close()}
            className="button-secondary"
          >
            Decline & Exit
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-8">Coding Platform</h1>
          <div className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-3 py-2 border border-gray-300 text-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full button-primary disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Start Coding'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Coding Platform</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                User: {user.phone_number}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'editor' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'dashboard' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Dashboard
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="button-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'editor' ? (
          <CodeEditor 
            userId={user.id} 
            sessionId={sessionId}
          />
        ) : (
          <Dashboard userId={user.id} />
        )}
      </main>
    </div>
  )
}

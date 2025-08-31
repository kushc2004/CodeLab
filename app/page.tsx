'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Save user to localStorage and state
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      // Create a new session
      await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          userId: data.user.id,
          language: 'python',
          code: ''
        }),
      })

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
        <div className="consent-card fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Research Participation Consent</h2>
          <div className="space-y-4 text-gray-600 mb-8">
            <p className="leading-relaxed">
              Welcome to our advanced coding research platform. This application is designed to collect and analyze 
              coding behavior patterns including:
            </p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Keystroke patterns and timing analysis</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Code structure and development progression</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Problem-solving approaches and methodologies</span>
              </li>
            </ul>
            <p className="leading-relaxed">
              All data is collected anonymously and used solely for academic research purposes to improve 
              programming education and development tools.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleConsentAccept}
              className="btn btn-primary flex-1 py-3 text-lg"
            >
              Accept & Continue to Platform
            </button>
            <button 
              onClick={() => window.close()}
              className="btn btn-secondary py-3"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card slide-up">
          {/* Header */}
          <div className="login-header">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
            </div>
            <h1 className="login-title">CodeLab Research</h1>
            <p className="login-subtitle">Advanced Coding Analytics Platform</p>
          </div>

          {/* Login Form */}
          <div className="space-y-6">
            <div>
              <div className='flex '>
                <div className="relative inset-y-0 left-0 pr-2 mb-1 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
              </div>
              <div className="relative">
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="input-field pl-10"
                  disabled={isLoading}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Used for session identification and research analytics
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="btn btn-primary w-full py-3 text-lg relative"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span>Start Coding Session</span>
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center text-xs text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure research platform - Data encrypted & anonymized
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="nav-header">
        <div className="nav-content">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h1 className="nav-title">CodeLab Research</h1>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">{user.phone_number}</span>
            </div>
            
            <div className="nav-tabs">
              <button
                onClick={() => setActiveTab('editor')}
                className={`nav-tab ${activeTab === 'editor' ? 'active' : 'inactive'}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Code Editor
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`nav-tab ${activeTab === 'dashboard' ? 'active' : 'inactive'}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="btn btn-secondary text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="fade-in">
          {activeTab === 'editor' ? (
            <div className="space-y-6">
              <div className="card p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Coding Environment</h2>
                    <p className="text-gray-600 mt-1">Write, test, and debug your code with our advanced editor</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="status-indicator status-success">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Session Active
                    </div>
                  </div>
                </div>
              </div>
              
              <CodeEditor 
                userId={user.id} 
                sessionId={sessionId}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="card p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
                    <p className="text-gray-600 mt-1">View your coding patterns and performance metrics</p>
                  </div>
                </div>
              </div>
              
              <Dashboard userId={user.id} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

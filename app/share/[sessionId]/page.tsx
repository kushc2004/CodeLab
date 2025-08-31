'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'

const CodeEditor = dynamic(() => import('@/components/CodeEditor'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="loading-spinner"></div></div>
})

interface SharedSession {
  id: string
  user_id: string
  language: 'cpp' | 'python'
  code: string
  created_at: string
}

export default function SharedSessionPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [session, setSession] = useState<SharedSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConsent, setShowConsent] = useState(true)
  const [userAccepted, setUserAccepted] = useState(false)

  useEffect(() => {
    if (userAccepted && sessionId) {
      loadSharedSession()
    }
  }, [sessionId, userAccepted])

  const loadSharedSession = async () => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Session not found or access denied')
        return
      }

      setSession(data.session)
    } catch (error) {
      setError('Failed to load shared session')
      console.error('Error loading shared session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConsentAccept = () => {
    setShowConsent(false)
    setUserAccepted(true)
  }

  if (showConsent) {
    return (
      <div className="consent-banner">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Shared Coding Session</h2>
          <p className="mb-4">
            You&apos;ve been invited to view and interact with a shared coding session. 
            This platform collects keystroke data including typing patterns, timing, 
            and code snapshots for research purposes.
          </p>
          <p className="mb-6">
            By continuing, you consent to this data collection while using the shared session.
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Session not found'}</p>
          <button
            onClick={() => window.history.back()}
            className="button-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Shared Coding Session</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Language: {session.language.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">
                Created: {new Date(session.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Shared Session Info
            </h3>
            <p className="text-sm text-blue-700">
              You&apos;re viewing a shared coding session. You can edit and run the code, 
              and your interactions will be tracked for research purposes.
            </p>
          </div>
        </div>
        
        <CodeEditor 
          userId="shared-user" 
          sessionId={sessionId}
        />
      </main>
    </div>
  )
}

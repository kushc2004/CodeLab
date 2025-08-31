'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalSessions: number
  totalKeystrokes: number
  totalExecutions: number
  languageStats: { [key: string]: number }
  recentSessions: Array<{
    id: string
    language: string
    created_at: string
    keystrokes_count: number
  }>
}

interface DashboardProps {
  userId: string
}

export default function Dashboard({ userId }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [userId])

  const loadDashboardStats = async () => {
    try {
      // Get total sessions
      const { count: totalSessions } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Get total keystrokes
      const { count: totalKeystrokes } = await supabase
        .from('keystrokes')
        .select('*', { count: 'exact', head: true })
        .in('session_id', 
          (await supabase
            .from('sessions')
            .select('id')
            .eq('user_id', userId)
          ).data?.map(s => s.id) || []
        )

      // Get total executions
      const { count: totalExecutions } = await supabase
        .from('code_executions')
        .select('*', { count: 'exact', head: true })
        .in('session_id',
          (await supabase
            .from('sessions')
            .select('id')
            .eq('user_id', userId)
          ).data?.map(s => s.id) || []
        )

      // Get language statistics
      const { data: sessions } = await supabase
        .from('sessions')
        .select('language')
        .eq('user_id', userId)

      const languageStats: { [key: string]: number } = {}
      sessions?.forEach(session => {
        languageStats[session.language] = (languageStats[session.language] || 0) + 1
      })

      // Get recent sessions with keystroke counts
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select(`
          id,
          language,
          created_at,
          keystrokes!inner(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        totalSessions: totalSessions || 0,
        totalKeystrokes: totalKeystrokes || 0,
        totalExecutions: totalExecutions || 0,
        languageStats,
        recentSessions: recentSessions?.map(session => ({
          id: session.id,
          language: session.language,
          created_at: session.created_at,
          keystrokes_count: Array.isArray(session.keystrokes) ? session.keystrokes.length : 0
        })) || []
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Analytics</h3>
        <p className="text-gray-600">Failed to load dashboard statistics. Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Track your coding progress and performance metrics</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
      
      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-label">Total Sessions</p>
              <p className="stats-value">{stats.totalSessions}</p>
              <p className="stats-change text-green-600">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Active
              </p>
            </div>
            <div className="stats-icon bg-blue-100">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-label">Total Keystrokes</p>
              <p className="stats-value">{stats.totalKeystrokes.toLocaleString()}</p>
              <p className="stats-change text-purple-600">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Tracked
              </p>
            </div>
            <div className="stats-icon bg-purple-100">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-label">Code Executions</p>
              <p className="stats-value">{stats.totalExecutions}</p>
              <p className="stats-change text-green-600">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9 0a9 9 0 118 0M4 12V8a8 8 0 0116 0v4" />
                </svg>
                Runs
              </p>
            </div>
            <div className="stats-icon bg-green-100">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-label">Avg. Keys/Session</p>
              <p className="stats-value">
                {stats.totalSessions > 0 
                  ? Math.round(stats.totalKeystrokes / stats.totalSessions).toLocaleString()
                  : 0
                }
              </p>
              <p className="stats-change text-orange-600">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Average
              </p>
            </div>
            <div className="stats-icon bg-orange-100">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Enhanced Language Statistics */}
        <div className="analytics-panel">
          <div className="panel-header">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Language Distribution</h3>
                <p className="text-sm text-gray-600">Programming language usage breakdown</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {Object.entries(stats.languageStats).length > 0 ? (
              Object.entries(stats.languageStats).map(([language, count]) => (
                <div key={language} className="language-stat-item">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        language === 'python' ? 'bg-blue-500' : 
                        language === 'cpp' ? 'bg-purple-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm font-semibold text-gray-900 uppercase">
                        {language}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-600">
                        {Math.round((count / stats.totalSessions) * 100)}%
                      </span>
                      <span className="text-sm font-semibold text-gray-900 min-w-[2rem] text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        language === 'python' ? 'bg-blue-500' : 
                        language === 'cpp' ? 'bg-purple-500' : 'bg-gray-500'
                      }`}
                      style={{ 
                        width: `${Math.max((count / stats.totalSessions) * 100, 5)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-500">No language data available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Recent Sessions */}
        <div className="analytics-panel">
          <div className="panel-header">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-sm text-gray-600">Your latest coding sessions</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {stats.recentSessions.length > 0 ? (
              <div className="space-y-4">
                {stats.recentSessions.map((session, index) => (
                  <div key={session.id} className="session-item">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            session.language === 'python' ? 'bg-blue-100' : 
                            session.language === 'cpp' ? 'bg-purple-100' : 'bg-gray-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              session.language === 'python' ? 'text-blue-600' : 
                              session.language === 'cpp' ? 'text-purple-600' : 'text-gray-600'
                            }`}>
                              {session.language.toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Session #{stats.recentSessions.length - index}
                          </p>
                          <p className="text-xs text-gray-500 font-mono">
                            {session.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {session.keystrokes_count} keys
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">No recent sessions found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

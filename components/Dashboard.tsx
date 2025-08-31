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
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center text-gray-500 py-8">
        Failed to load dashboard statistics.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Total Sessions
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.totalSessions}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Total Keystrokes
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.totalKeystrokes.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Code Executions
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.totalExecutions}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Avg. Keystrokes/Session
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats.totalSessions > 0 
              ? Math.round(stats.totalKeystrokes / stats.totalSessions)
              : 0
            }
          </p>
        </div>
      </div>

      {/* Language Statistics */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Language Usage
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.languageStats).map(([language, count]) => (
            <div key={language} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 uppercase">
                {language}
              </span>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: `${(count / stats.totalSessions) * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-500 w-8 text-right">
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Recent Sessions
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Keystrokes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentSessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {session.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 uppercase">
                    {session.language}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(session.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.keystrokes_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

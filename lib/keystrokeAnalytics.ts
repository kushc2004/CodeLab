// Utility functions to analyze keystroke window data
import { supabase } from './supabase'

export interface KeystrokeWindowData {
  id: string
  session_id: string
  window_start_time: string
  window_end_time: string
  keystrokes_data: Array<{
    key: string
    action: string
    timestamp_offset: number
    cursor_position: number
  }>
  cursor_position_start?: number
  cursor_position_end?: number
  code_snapshot_start?: string
  code_snapshot_end?: string
  total_keystrokes: number
  created_at: string
}

export interface KeystrokeAnalytics {
  totalWindows: number
  totalKeystrokes: number
  averageKeystrokesPerWindow: number
  keystrokeFrequencyByKey: { [key: string]: number }
  windowDuration: number
  fastestWindow: { keystrokes: number; timeWindow: string }
  slowestWindow: { keystrokes: number; timeWindow: string }
}

// Get keystroke windows for a session
export async function getKeystrokeWindows(sessionId: string): Promise<KeystrokeWindowData[]> {
  try {
    const { data, error } = await supabase
      .from('keystroke_windows')
      .select('*')
      .eq('session_id', sessionId)
      .order('window_start_time', { ascending: true })

    if (error) {
      console.error('Error fetching keystroke windows:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getKeystrokeWindows:', error)
    return []
  }
}

// Analyze keystroke patterns
export function analyzeKeystrokePatterns(windows: KeystrokeWindowData[]): KeystrokeAnalytics {
  const totalWindows = windows.length
  const totalKeystrokes = windows.reduce((sum, w) => sum + w.total_keystrokes, 0)
  const averageKeystrokesPerWindow = totalWindows > 0 ? totalKeystrokes / totalWindows : 0

  // Count frequency of each key
  const keystrokeFrequencyByKey: { [key: string]: number } = {}
  let fastestWindow = { keystrokes: 0, timeWindow: '' }
  let slowestWindow = { keystrokes: Infinity, timeWindow: '' }

  windows.forEach(window => {
    // Count keystrokes by key
    window.keystrokes_data.forEach(keystroke => {
      const key = keystroke.key
      keystrokeFrequencyByKey[key] = (keystrokeFrequencyByKey[key] || 0) + 1
    })

    // Find fastest/slowest windows
    if (window.total_keystrokes > fastestWindow.keystrokes) {
      fastestWindow = {
        keystrokes: window.total_keystrokes,
        timeWindow: new Date(window.window_start_time).toISOString()
      }
    }
    if (window.total_keystrokes < slowestWindow.keystrokes && window.total_keystrokes > 0) {
      slowestWindow = {
        keystrokes: window.total_keystrokes,
        timeWindow: new Date(window.window_start_time).toISOString()
      }
    }
  })

  if (slowestWindow.keystrokes === Infinity) {
    slowestWindow = { keystrokes: 0, timeWindow: '' }
  }

  return {
    totalWindows,
    totalKeystrokes,
    averageKeystrokesPerWindow: Math.round(averageKeystrokesPerWindow * 100) / 100,
    keystrokeFrequencyByKey,
    windowDuration: 100, // 100ms windows
    fastestWindow,
    slowestWindow
  }
}

// Get typing speed analysis (keystrokes per second)
export function getTypingSpeedAnalysis(windows: KeystrokeWindowData[]): {
  averageKeystrokesPerSecond: number
  peakKeystrokesPerSecond: number
  typingBursts: Array<{ startTime: string; keystrokesPerSecond: number }>
} {
  // Group windows by second
  const secondGroups: { [second: string]: number } = {}
  
  windows.forEach(window => {
    const windowStart = new Date(window.window_start_time)
    const secondKey = new Date(
      windowStart.getFullYear(),
      windowStart.getMonth(),
      windowStart.getDate(),
      windowStart.getHours(),
      windowStart.getMinutes(),
      windowStart.getSeconds()
    ).toISOString()
    
    secondGroups[secondKey] = (secondGroups[secondKey] || 0) + window.total_keystrokes
  })

  const keystrokesPerSecond = Object.values(secondGroups)
  const averageKeystrokesPerSecond = keystrokesPerSecond.reduce((a, b) => a + b, 0) / keystrokesPerSecond.length || 0
  const peakKeystrokesPerSecond = Math.max(...keystrokesPerSecond, 0)

  // Find typing bursts (>= 5 keystrokes per second)
  const typingBursts = Object.entries(secondGroups)
    .filter(([, count]) => count >= 5)
    .map(([time, count]) => ({
      startTime: time,
      keystrokesPerSecond: count
    }))
    .sort((a, b) => b.keystrokesPerSecond - a.keystrokesPerSecond)

  return {
    averageKeystrokesPerSecond: Math.round(averageKeystrokesPerSecond * 100) / 100,
    peakKeystrokesPerSecond,
    typingBursts
  }
}

// Export data to JSON for research analysis
export function exportKeystrokeData(windows: KeystrokeWindowData[]): string {
  const analytics = analyzeKeystrokePatterns(windows)
  const typingSpeed = getTypingSpeedAnalysis(windows)
  
  const exportData = {
    metadata: {
      exportTimestamp: new Date().toISOString(),
      totalWindows: windows.length,
      windowDuration: '100ms',
      description: 'Keystroke data aggregated by 100ms time windows for research analysis'
    },
    analytics,
    typingSpeed,
    rawData: windows
  }
  
  return JSON.stringify(exportData, null, 2)
}

import { supabase } from './supabase'

export interface KeystrokeEvent {
  key: string
  action: 'keydown' | 'keyup' | 'input'
  timestamp: Date
  cursorPosition: number
  timestampOffset: number // Milliseconds from window start
}

export interface KeystrokeWindow {
  sessionId: string
  windowStartTime: Date
  windowEndTime: Date
  keystrokes: KeystrokeEvent[]
  cursorPositionStart?: number
  cursorPositionEnd?: number
  codeSnapshotStart?: string
  codeSnapshotEnd?: string
}

export class TimeWindowedKeystrokeTracker {
  private sessionId: string
  private currentWindow: KeystrokeWindow | null = null
  private windowBuffer: KeystrokeWindow[] = []
  private windowDuration = 100 // 100ms windows
  private flushInterval = 5000 // Flush every 5 seconds
  private isTracking = false
  private lastFlush: number = Date.now()

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  start() {
    this.isTracking = true
    this.scheduleFlush()
  }

  stop() {
    this.isTracking = false
    this.finalizeCurrentWindow()
    this.flush() // Final flush
  }

  recordKeystroke(data: {
    timestamp: Date
    key: string
    action: 'keydown' | 'keyup' | 'input'
    cursorPosition: number
    codeSnapshot: string
  }) {
    if (!this.isTracking) return

    const timestamp = data.timestamp
    const windowStartTime = this.getWindowStartTime(timestamp)
    
    // Check if we need a new window
    if (!this.currentWindow || this.currentWindow.windowStartTime.getTime() !== windowStartTime.getTime()) {
      // Finalize the previous window
      this.finalizeCurrentWindow()
      
      // Create new window
      this.currentWindow = {
        sessionId: this.sessionId,
        windowStartTime: windowStartTime,
        windowEndTime: new Date(windowStartTime.getTime() + this.windowDuration),
        keystrokes: [],
        cursorPositionStart: data.cursorPosition,
        codeSnapshotStart: data.codeSnapshot
      }
    }

    // Add keystroke to current window
    const timestampOffset = timestamp.getTime() - this.currentWindow.windowStartTime.getTime()
    
    this.currentWindow.keystrokes.push({
      key: data.key,
      action: data.action,
      timestamp: timestamp,
      cursorPosition: data.cursorPosition,
      timestampOffset: timestampOffset
    })

    // Update window end state
    this.currentWindow.cursorPositionEnd = data.cursorPosition
    this.currentWindow.codeSnapshotEnd = data.codeSnapshot

    // Auto-flush if buffer is getting large or enough time has passed
    if (this.windowBuffer.length > 20 || Date.now() - this.lastFlush > this.flushInterval) {
      this.flush()
    }
  }

  private getWindowStartTime(timestamp: Date): Date {
    // Round down to nearest 100ms boundary
    const timeMs = timestamp.getTime()
    const windowMs = Math.floor(timeMs / this.windowDuration) * this.windowDuration
    return new Date(windowMs)
  }

  private finalizeCurrentWindow() {
    if (this.currentWindow && this.currentWindow.keystrokes.length > 0) {
      this.windowBuffer.push(this.currentWindow)
      this.currentWindow = null
    }
  }

  private async flush() {
    if (this.windowBuffer.length === 0) return

    const dataToFlush = [...this.windowBuffer]
    this.windowBuffer = []
    this.lastFlush = Date.now()

    try {
      const windowsToInsert = dataToFlush.map(window => ({
        session_id: window.sessionId,
        window_start_time: window.windowStartTime.toISOString(),
        window_end_time: window.windowEndTime.toISOString(),
        keystrokes_data: window.keystrokes.map(k => ({
          key: k.key,
          action: k.action,
          timestamp_offset: k.timestampOffset,
          cursor_position: k.cursorPosition
        })),
        cursor_position_start: window.cursorPositionStart,
        cursor_position_end: window.cursorPositionEnd,
        code_snapshot_start: window.codeSnapshotStart,
        code_snapshot_end: window.codeSnapshotEnd,
        total_keystrokes: window.keystrokes.length
      }))

      const { error } = await supabase
        .from('keystroke_windows')
        .insert(windowsToInsert)

      if (error) {
        console.error('Failed to flush keystroke windows:', error)
        // Re-add to buffer for retry
        this.windowBuffer.unshift(...dataToFlush)
      } else {
        console.log(`Flushed ${dataToFlush.length} keystroke windows to database`)
      }
    } catch (error) {
      console.error('Error flushing keystroke windows:', error)
      // Re-add to buffer for retry
      this.windowBuffer.unshift(...dataToFlush)
    }
  }

  private scheduleFlush() {
    if (!this.isTracking) return

    setTimeout(() => {
      this.finalizeCurrentWindow()
      this.flush()
      this.scheduleFlush()
    }, this.flushInterval)
  }

  // Utility method to get keystroke statistics
  getWindowStatistics(): {
    currentWindowKeystrokes: number
    bufferedWindows: number
    averageKeystrokesPerWindow: number
  } {
    const currentCount = this.currentWindow ? this.currentWindow.keystrokes.length : 0
    const bufferedCount = this.windowBuffer.length
    const totalKeystrokes = this.windowBuffer.reduce((sum, window) => sum + window.keystrokes.length, 0)
    const avgPerWindow = bufferedCount > 0 ? totalKeystrokes / bufferedCount : 0

    return {
      currentWindowKeystrokes: currentCount,
      bufferedWindows: bufferedCount,
      averageKeystrokesPerWindow: Math.round(avgPerWindow * 100) / 100
    }
  }
}

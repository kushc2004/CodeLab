import { supabase } from './supabase'

export interface KeystrokeData {
  sessionId: string
  timestamp: Date // Changed from number to Date
  key: string
  action: 'keydown' | 'keyup' | 'input'
  cursorPosition: number
  codeSnapshot: string
}

export class KeystrokeTracker {
  private sessionId: string
  private keystrokeBuffer: KeystrokeData[] = []
  private lastFlush: number = Date.now()
  private flushInterval = 1000 // Flush every 1 second
  private isTracking = false

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  start() {
    this.isTracking = true
    this.scheduleFlush()
  }

  stop() {
    this.isTracking = false
    this.flush() // Final flush
  }

  recordKeystroke(data: Omit<KeystrokeData, 'sessionId'>) {
    if (!this.isTracking) return

    this.keystrokeBuffer.push({
      ...data,
      sessionId: this.sessionId
    })

    // Auto-flush if buffer is getting large or enough time has passed
    if (this.keystrokeBuffer.length > 50 || Date.now() - this.lastFlush > this.flushInterval) {
      this.flush()
    }
  }

  private async flush() {
    if (this.keystrokeBuffer.length === 0) return

    const dataToFlush = [...this.keystrokeBuffer]
    this.keystrokeBuffer = []
    this.lastFlush = Date.now()

    try {
      const { error } = await supabase
        .from('keystrokes')
        .insert(
          dataToFlush.map(data => ({
            session_id: data.sessionId,
            timestamp: data.timestamp.toISOString(), // Convert Date to ISO string
            key: data.key,
            action: data.action,
            cursor_position: data.cursorPosition,
            code_snapshot: data.codeSnapshot
          }))
        )

      if (error) {
        console.error('Failed to flush keystrokes:', error)
        // Re-add to buffer for retry
        this.keystrokeBuffer.unshift(...dataToFlush)
      }
    } catch (error) {
      console.error('Error flushing keystrokes:', error)
      // Re-add to buffer for retry
      this.keystrokeBuffer.unshift(...dataToFlush)
    }
  }

  private scheduleFlush() {
    if (!this.isTracking) return

    setTimeout(() => {
      this.flush()
      this.scheduleFlush()
    }, this.flushInterval)
  }
}

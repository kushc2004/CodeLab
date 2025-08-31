'use client'

import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { supabase } from '@/lib/supabase'
import { executeCode } from '@/lib/realExecution'
import { TimeWindowedKeystrokeTracker } from '@/lib/timeWindowedKeystrokeTracker'
import { generateShareLink, copyToClipboard } from '@/lib/shareUtils'

// Define code templates locally to avoid import issues
const codeTemplates = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    // Example: Working with vectors
    vector<int> nums = {5, 2, 8, 1, 9};
    sort(nums.begin(), nums.end());
    
    cout << "Sorted numbers: ";
    for (int num : nums) {
        cout << num << " ";
    }
    cout << endl;
    
    // Example: Reading input
    // Uncomment lines below to test input:
    // int n;
    // cout << "Enter a number: ";
    // cin >> n;
    // cout << "You entered: " << n << endl;
    
    return 0;
}`,
  python: `print("Hello, World!")

# Write your code here
`
}

interface CodeEditorProps {
  userId: string
  sessionId: string
}

export default function CodeEditor({ userId, sessionId }: CodeEditorProps) {
  const [language, setLanguage] = useState<'cpp' | 'python'>('python')
  const [code, setCode] = useState(codeTemplates.python)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [shareMessage, setShareMessage] = useState('')
  const [pyodideReady, setPyodideReady] = useState(false)
  const [keystrokeStats, setKeystrokeStats] = useState({ currentWindowKeystrokes: 0, bufferedWindows: 0 })
  
  const editorRef = useRef<any>(null)
  const keystrokeTrackerRef = useRef<TimeWindowedKeystrokeTracker | null>(null)

  useEffect(() => {
    // Initialize keystroke tracker
    keystrokeTrackerRef.current = new TimeWindowedKeystrokeTracker(sessionId)
    keystrokeTrackerRef.current.start()

    // Load existing session if available
    loadSession()

    // Cleanup on unmount
    return () => {
      if (keystrokeTrackerRef.current) {
        keystrokeTrackerRef.current.stop()
      }
      saveSession()
    }
  }, [sessionId])

  useEffect(() => {
    // Auto-save every 30 seconds
    const interval = setInterval(() => {
      saveSession()
    }, 30000)

    return () => clearInterval(interval)
  }, [code, language])

  useEffect(() => {
    // Update keystroke statistics every 2 seconds
    const interval = setInterval(() => {
      if (keystrokeTrackerRef.current) {
        const stats = keystrokeTrackerRef.current.getWindowStatistics()
        setKeystrokeStats({
          currentWindowKeystrokes: stats.currentWindowKeystrokes,
          bufferedWindows: stats.bufferedWindows
        })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (keystrokeTrackerRef.current) {
        keystrokeTrackerRef.current.stop()
      }
      saveSession()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const loadSession = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        console.error('Error loading session:', error)
        return
      }

      if (data) {
        setLanguage(data.language)
        setCode(data.code || codeTemplates[data.language as 'cpp' | 'python'])
      }
    } catch (error) {
      console.error('Error loading session:', error)
    }
  }

  const saveSession = async () => {
    try {
      await supabase
        .from('sessions')
        .update({
          language,
          code,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    
    // Add keystroke listeners
    editor.onKeyDown((e: any) => {
      if (keystrokeTrackerRef.current) {
        const position = editor.getPosition()
        keystrokeTrackerRef.current.recordKeystroke({
          timestamp: new Date(), // Use Date object instead of Date.now()
          key: e.browserEvent.key,
          action: 'keydown',
          cursorPosition: editor.getModel()?.getOffsetAt(position) || 0,
          codeSnapshot: editor.getValue()
        })
      }
    })

    editor.onKeyUp((e: any) => {
      if (keystrokeTrackerRef.current) {
        const position = editor.getPosition()
        keystrokeTrackerRef.current.recordKeystroke({
          timestamp: new Date(), // Use Date object instead of Date.now()
          key: e.browserEvent.key,
          action: 'keyup',
          cursorPosition: editor.getModel()?.getOffsetAt(position) || 0,
          codeSnapshot: editor.getValue()
        })
      }
    })
  }

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    
    if (keystrokeTrackerRef.current && editorRef.current) {
      const position = editorRef.current.getPosition()
      keystrokeTrackerRef.current.recordKeystroke({
        timestamp: new Date(), // Use Date object instead of Date.now()
        key: 'input',
        action: 'input',
        cursorPosition: editorRef.current.getModel()?.getOffsetAt(position) || 0,
        codeSnapshot: newCode
      })
    }
  }

  const handleLanguageChange = (newLanguage: 'cpp' | 'python') => {
    setLanguage(newLanguage)
    setCode(codeTemplates[newLanguage])
    setOutput('')
  }

  const handleRunCode = async () => {
    if (!code.trim()) {
      setOutput('Error: No code to execute')
      return
    }

    setIsRunning(true)
    setOutput(`Executing ${language.toUpperCase()} code...`)

    try {
      // Use API for execution (supports both Python and real C++)
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          input
        })
      })
      
      const result = await response.json()
      
      // Save execution to database
      await supabase
        .from('code_executions')
        .insert([{
          session_id: sessionId,
          code,
          language,
          output: result.output,
          error: result.error,
          execution_time: result.executionTime
        }])

      if (result.error) {
        setOutput(`Error: ${result.error}`)
      } else {
        setOutput(result.output || 'Code executed successfully (no output)')
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleShareSession = async () => {
    try {
      const shareUrl = generateShareLink(sessionId)
      const success = await copyToClipboard(shareUrl)
      
      if (success) {
        setShareMessage('Share link copied to clipboard!')
        setTimeout(() => setShareMessage(''), 3000)
      } else {
        setShareMessage('Failed to copy link. Please try again.')
        setTimeout(() => setShareMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error sharing session:', error)
      setShareMessage('Error creating share link.')
      setTimeout(() => setShareMessage(''), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">Code Editor</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => handleLanguageChange('python')}
              className={`px-3 py-1 rounded ${
                language === 'python' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Python
            </button>
            <button
              onClick={() => handleLanguageChange('cpp')}
              className={`px-3 py-1 rounded ${
                language === 'cpp' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              C++
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleShareSession}
            className="button-secondary"
          >
            Share Session
          </button>
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="button-success disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {/* Keystroke Tracking Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h3 className="text-sm font-medium text-blue-800 mb-2">🔬 Enhanced Keystroke Tracking</h3>
        <p className="text-xs text-blue-700 mb-1">
          <strong>New:</strong> Keystrokes are now collected in 100ms time windows instead of individual timestamps
        </p>
        <p className="text-xs text-blue-600">
          Current window: <span className="font-mono font-semibold">{keystrokeStats.currentWindowKeystrokes}</span> keystrokes | 
          Buffered: <span className="font-mono font-semibold">{keystrokeStats.bufferedWindows}</span> windows ready to save
        </p>
      </div>

      {/* Share Message */}
      {shareMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-700">{shareMessage}</p>
        </div>
      )}

      {/* Editor and Output Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Code Editor</h3>
            <div className="code-editor h-80">
              <Editor
                height="100%"
                language={language === 'cpp' ? 'cpp' : 'python'}
                value={code}
                onChange={handleCodeChange}
                onMount={handleEditorDidMount}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: language === 'python' ? 4 : 2,
                  insertSpaces: true,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>
          
          {/* Input Panel (especially useful for C++) */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Program Input {language === 'cpp' && <span className="text-blue-600">(stdin for C++)</span>}
            </h3>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'cpp' 
                ? 'Enter input that your C++ program expects from stdin...' 
                : 'Enter any input your program might need...'}
              className="w-full h-20 p-2 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Output</h3>
          {language === 'cpp' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700">
                🔧 <strong>Real C++ Compilation:</strong> Your code is compiled with g++ and executed with actual binary output!
              </p>
            </div>
          )}
          {language === 'python' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                🐍 <strong>Real Python Execution:</strong> Your code runs on the actual Python interpreter (python3)!
              </p>
            </div>
          )}
          <div className="output-panel h-96 p-4 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">
              {output || 'Click "Run Code" to see output here...'}
            </pre>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-100 px-4 py-2 rounded">
        <span>
          Language: {language.toUpperCase()}
          {language === 'python' && (
            <span className={`ml-2 ${pyodideReady ? 'text-green-600' : 'text-orange-600'}`}>
              ({pyodideReady ? 'Python Ready' : 'Python Loading'})
            </span>
          )}
        </span>
        <span>
          Keystroke Tracking: {keystrokeStats.currentWindowKeystrokes} keys in current 100ms window
          {keystrokeStats.bufferedWindows > 0 && ` | ${keystrokeStats.bufferedWindows} windows buffered`}
        </span>
        <span>Auto-save enabled</span>
        <span>Session: {sessionId.slice(0, 8)}...</span>
      </div>
    </div>
  )
}

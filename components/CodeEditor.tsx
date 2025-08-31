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
      {/* Professional Header Controls */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Code Editor</h2>
                <p className="text-sm text-gray-600">Write and execute your algorithms</p>
              </div>
            </div>
            
            <div className="language-selector">
              <button
                onClick={() => handleLanguageChange('python')}
                className={`language-tab ${language === 'python' ? 'active' : 'inactive'}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Python
              </button>
              <button
                onClick={() => handleLanguageChange('cpp')}
                className={`language-tab ${language === 'cpp' ? 'active' : 'inactive'}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                C++
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleShareSession}
              className="btn btn-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              Share
            </button>
            
          </div>
        </div>
      </div>

      {/* Compact Keystroke Tracking Panel */}
      <div className="compact-tracking-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-purple-100 rounded-md flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900">Keystroke Analytics</span>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <span className="text-gray-600 mr-1">Current:</span>
              <span className="font-semibold text-purple-600">{keystrokeStats.currentWindowKeystrokes}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600 mr-1">Buffered:</span>
              <span className="font-semibold text-blue-600">{keystrokeStats.bufferedWindows}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Share Success Message */}
      {shareMessage && (
        <div className="success-banner">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">{shareMessage}</p>
          </div>
        </div>
      )}

      {/* Optimized Editor Layout */}
      <div className="optimized-editor-layout">
        {/* Left Side - Code Editor (Larger) */}
        <div className="code-editor-section">
          <div className="panel-header">
            <h3 className="panel-title">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code Editor
            </h3>
            <div className='flex items-center space-x-3'>
            <div className="language-badge">
              {language === 'python' ? (
                <div className="flex items-center text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  Python
                </div>
              ) : (
                <div className="flex items-center text-purple-700">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                  C++
                </div>
              )}
              
            </div>
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="btn btn-primary flex items-center"
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9 0a9 9 0 118 0M4 12V8a8 8 0 0116 0v4" />
                  </svg>
                  Run Code
                </>
              )}
            </button>
            </div>
            
          </div>
          
          <div className="large-editor-container">
            <Editor
              height="600px"
              language={language === 'cpp' ? 'cpp' : 'python'}
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: language === 'python' ? 4 : 2,
                insertSpaces: true,
                wordWrap: 'on',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                },
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>
        </div>

        {/* Right Side - Input/Output Split */}
        <div className="side-panel-section">
          {/* Input Section (Top Half) */}
          <div className="input-panel">
            <div className="panel-header">
              <h4 className="panel-title">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" />
                </svg>
                Program Input
                {language === 'cpp' && <span className="text-purple-600 ml-2">(stdin)</span>}
              </h4>
            </div>
            <div className="input-content">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={language === 'cpp' 
                  ? 'Enter input that your C++ program expects from stdin...' 
                  : 'Enter any input your program might need...'}
                className="side-input-textarea"
              />
            </div>
            
            {/* Language Info Banner */}
            {language === 'cpp' && (
              <div className="execution-banner cpp-banner mb-0">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-purple-800">Real C++ Compilation</p>
                  </div>
                </div>
              </div>
            )}
            
            {language === 'python' && (
              <div className="execution-banner python-banner mb-0">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-blue-800">Real Python Execution</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Output Section (Bottom Half) */}
          <div className="output-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Output
              </h3>
              <div className="execution-status">
                {isRunning ? (
                  <div className="status-indicator status-running">
                    <div className="animate-pulse w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    Executing
                  </div>
                ) : (
                  <div className="status-indicator status-ready">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Ready
                  </div>
                )}
              </div>
            </div>

            <div className="side-output-container">
              <pre className="side-output-content">
                {output || (
                  <span className="output-placeholder">
                    Click "Run Code" to see output here...
                    <br />
                    <span className="text-xs text-gray-500">
                      Your code execution results will appear in this panel
                    </span>
                  </span>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Professional Status Bar */}
      <div className="status-bar">
        <div className="status-section">
          <span className="status-label">Language:</span>
          <span className="status-value">{language.toUpperCase()}</span>
          {language === 'python' && (
            <span className={`status-indicator ml-2 ${pyodideReady ? 'text-green-600' : 'text-orange-600'}`}>
              ({pyodideReady ? 'Ready' : 'Loading'})
            </span>
          )}
        </div>
        
        <div className="status-section">
          <span className="status-label">Tracking:</span>
          <span className="status-value">{keystrokeStats.currentWindowKeystrokes} keys</span>
          {keystrokeStats.bufferedWindows > 0 && (
            <span className="status-indicator text-blue-600 ml-1">
              | {keystrokeStats.bufferedWindows} buffered
            </span>
          )}
        </div>
        
        <div className="status-section">
          <span className="status-label">Auto-save:</span>
          <span className="status-value text-green-600">Enabled</span>
        </div>
        
        <div className="status-section">
          <span className="status-label">Session:</span>
          <span className="status-value font-mono">{sessionId.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  )
}

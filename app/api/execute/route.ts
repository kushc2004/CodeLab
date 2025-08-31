import { NextRequest, NextResponse } from 'next/server'
import { executeCode, checkCompilerAvailability, checkPythonAvailability } from '@/lib/realExecution'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, language, input = '' } = body

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      )
    }

    if (language !== 'cpp' && language !== 'python') {
      return NextResponse.json(
        { error: 'Unsupported language' },
        { status: 400 }
      )
    }

    // Check if required interpreters/compilers are available (server-side only)
    if (typeof window === 'undefined') {
      if (language === 'cpp') {
        const compilerCheck = await checkCompilerAvailability()
        if (!compilerCheck.available) {
          console.warn('C++ compiler not available:', compilerCheck.error)
          return NextResponse.json({
            output: '',
            error: `C++ compiler not available: ${compilerCheck.error}. Please install g++ on the server.`,
            executionTime: 0
          })
        }
        console.log('C++ compiler available:', compilerCheck.version)
      } else if (language === 'python') {
        const pythonCheck = await checkPythonAvailability()
        if (!pythonCheck.available) {
          console.warn('Python interpreter not available:', pythonCheck.error)
          return NextResponse.json({
            output: '',
            error: `Python interpreter not available: ${pythonCheck.error}. Please install python3 on the server.`,
            executionTime: 0
          })
        }
        console.log('Python interpreter available:', pythonCheck.version)
      }
    }

    const result = await executeCode(code, language, input)
    console.log('Execution result:', result)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Code execution error:', error)
    return NextResponse.json(
      { error: 'Internal server error during code execution' },
      { status: 500 }
    )
  }
}

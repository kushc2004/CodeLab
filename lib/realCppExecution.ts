// Real C++ compilation and execution using Node.js child_process
import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import os from 'os'

export interface ExecutionResult {
  output: string
  error?: string
  executionTime: number
}

// Main execution function for real C++ compilation
export async function executeRealCpp(code: string, input: string = ''): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  // Generate unique session ID for this compilation
  const sessionId = uuidv4()
  const tempDir = os.tmpdir()
  const sourceFile = path.join(tempDir, `temp_${sessionId}.cpp`)
  const executableFile = path.join(tempDir, `temp_${sessionId}`)
  
  try {
    console.log('Starting real C++ compilation for session:', sessionId)
    
    // Write C++ code to temporary file
    await fs.writeFile(sourceFile, code)
    console.log('Source file written:', sourceFile)
    
    // Compile the C++ code
    const compileResult = await compileCode(sourceFile, executableFile)
    
    if (!compileResult.success) {
      return {
        output: '',
        error: `Compilation Error: ${compileResult.error}`,
        executionTime: Date.now() - startTime
      }
    }
    
    console.log('Compilation successful, executing...')
    
    // Execute the compiled program
    const executeResult = await executeCompiledCode(executableFile, input)
    
    return {
      output: executeResult.output || '',
      error: executeResult.error || undefined,
      executionTime: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('Real C++ execution error:', error)
    return {
      output: '',
      error: error instanceof Error ? error.message : 'System error during C++ execution',
      executionTime: Date.now() - startTime
    }
  } finally {
    // Cleanup temporary files
    await cleanup(sourceFile, executableFile)
  }
}

// Compile C++ code using g++
function compileCode(sourceFile: string, executableFile: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    console.log('Compiling with g++:', sourceFile, '->', executableFile)
    
    // Use g++ to compile with C++17 standard
    const compiler = spawn('g++', [
      sourceFile,
      '-o', executableFile,
      '-std=c++17',
      '-Wall',
      '-O2'
    ])
    
    let errorOutput = ''
    
    compiler.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    compiler.stdout.on('data', (data) => {
      console.log('Compiler stdout:', data.toString())
    })
    
    compiler.on('close', (code) => {
      console.log('Compiler exit code:', code)
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: errorOutput || 'Compilation failed with unknown error' })
      }
    })
    
    compiler.on('error', (error) => {
      console.error('Compiler spawn error:', error)
      resolve({ success: false, error: `Failed to start compiler: ${error.message}` })
    })
    
    // Set timeout for compilation (30 seconds)
    const timeout = setTimeout(() => {
      console.log('Compilation timeout, killing process')
      compiler.kill('SIGKILL')
      resolve({ success: false, error: 'Compilation timeout (30s limit exceeded)' })
    }, 30000)
    
    compiler.on('close', () => {
      clearTimeout(timeout)
    })
  })
}

// Execute the compiled C++ program
function executeCompiledCode(executableFile: string, input: string): Promise<{ output: string; error?: string; exitCode: number }> {
  return new Promise((resolve) => {
    console.log('Executing compiled program:', executableFile)
    
    const execution = spawn(executableFile, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let output = ''
    let errorOutput = ''
    
    // Send input to the program if provided
    if (input) {
      console.log('Sending input to program:', input)
      execution.stdin.write(input)
    }
    execution.stdin.end()
    
    execution.stdout.on('data', (data) => {
      const chunk = data.toString()
      output += chunk
      console.log('Program stdout:', chunk)
    })
    
    execution.stderr.on('data', (data) => {
      const chunk = data.toString()
      errorOutput += chunk
      console.log('Program stderr:', chunk)
    })
    
    execution.on('close', (code) => {
      console.log('Program exit code:', code)
      resolve({
        output: output,
        error: errorOutput || undefined,
        exitCode: code || 0
      })
    })
    
    execution.on('error', (error) => {
      console.error('Execution spawn error:', error)
      resolve({
        output: '',
        error: `Failed to execute program: ${error.message}`,
        exitCode: -1
      })
    })
    
    // Set timeout for execution (10 seconds)
    const timeout = setTimeout(() => {
      console.log('Execution timeout, killing process')
      execution.kill('SIGKILL')
      resolve({
        output: output,
        error: (errorOutput || '') + '\nExecution timeout (10s limit exceeded)',
        exitCode: -1
      })
    }, 10000)
    
    execution.on('close', () => {
      clearTimeout(timeout)
    })
  })
}

// Cleanup temporary files
async function cleanup(sourceFile: string, executableFile: string): Promise<void> {
  try {
    console.log('Cleaning up temporary files...')
    
    // Remove source file
    try {
      await fs.unlink(sourceFile)
      console.log('Removed source file:', sourceFile)
    } catch (error) {
      console.log('Source file cleanup (non-critical):', error)
    }
    
    // Remove executable file
    try {
      await fs.unlink(executableFile)
      console.log('Removed executable file:', executableFile)
    } catch (error) {
      console.log('Executable file cleanup (non-critical):', error)
    }
    
  } catch (error) {
    console.error('Cleanup error (non-critical):', error)
  }
}

// Check if g++ compiler is available
export async function checkCompilerAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    const versionCheck = spawn('g++', ['--version'])
    
    let output = ''
    let errorOutput = ''
    
    versionCheck.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    versionCheck.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    versionCheck.on('close', (code) => {
      if (code === 0) {
        const versionLine = output.split('\n')[0]
        resolve({ available: true, version: versionLine })
      } else {
        resolve({ available: false, error: errorOutput || 'g++ not found' })
      }
    })
    
    versionCheck.on('error', (error) => {
      resolve({ available: false, error: `g++ not available: ${error.message}` })
    })
    
    // Timeout for version check
    setTimeout(() => {
      versionCheck.kill()
      resolve({ available: false, error: 'Compiler check timeout' })
    }, 5000)
  })
}

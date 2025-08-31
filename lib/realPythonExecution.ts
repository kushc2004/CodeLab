// Real Python execution using Node.js child_process
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

// Main execution function for real Python execution
export async function executeRealPython(code: string, input: string = ''): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  // Generate unique session ID for this execution
  const sessionId = uuidv4()
  const tempDir = os.tmpdir()
  const sourceFile = path.join(tempDir, `temp_${sessionId}.py`)
  
  try {
    console.log('Starting real Python execution for session:', sessionId)
    
    // Write Python code to temporary file
    await fs.writeFile(sourceFile, code)
    console.log('Python source file written:', sourceFile)
    
    // Execute the Python code
    const executeResult = await executePythonCode(sourceFile, input)
    
    return {
      output: executeResult.output || '',
      error: executeResult.error || undefined,
      executionTime: Date.now() - startTime
    }
    
  } catch (error) {
    console.error('Real Python execution error:', error)
    return {
      output: '',
      error: error instanceof Error ? error.message : 'System error during Python execution',
      executionTime: Date.now() - startTime
    }
  } finally {
    // Cleanup temporary files
    await cleanup(sourceFile)
  }
}

// Execute Python code using python3
function executePythonCode(sourceFile: string, input: string): Promise<{ output: string; error?: string; exitCode: number }> {
  return new Promise((resolve) => {
    console.log('Executing Python file:', sourceFile)
    
    // Use python3 to execute the script
    const execution = spawn('python3', [sourceFile], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    let output = ''
    let errorOutput = ''
    
    // Send input to the program if provided
    if (input) {
      console.log('Sending input to Python program:', input)
      execution.stdin.write(input)
    }
    execution.stdin.end()
    
    execution.stdout.on('data', (data) => {
      const chunk = data.toString()
      output += chunk
      console.log('Python stdout:', chunk)
    })
    
    execution.stderr.on('data', (data) => {
      const chunk = data.toString()
      errorOutput += chunk
      console.log('Python stderr:', chunk)
    })
    
    execution.on('close', (code) => {
      console.log('Python exit code:', code)
      resolve({
        output: output,
        error: errorOutput || undefined,
        exitCode: code || 0
      })
    })
    
    execution.on('error', (error) => {
      console.error('Python execution spawn error:', error)
      resolve({
        output: '',
        error: `Failed to execute Python: ${error.message}`,
        exitCode: -1
      })
    })
    
    // Set timeout for execution (30 seconds)
    const timeout = setTimeout(() => {
      console.log('Python execution timeout, killing process')
      execution.kill('SIGKILL')
      resolve({
        output: output,
        error: (errorOutput || '') + '\nExecution timeout (30s limit exceeded)',
        exitCode: -1
      })
    }, 30000)
    
    execution.on('close', () => {
      clearTimeout(timeout)
    })
  })
}

// Cleanup temporary files
async function cleanup(sourceFile: string): Promise<void> {
  try {
    console.log('Cleaning up Python temporary file...')
    
    // Remove source file
    try {
      await fs.unlink(sourceFile)
      console.log('Removed Python source file:', sourceFile)
    } catch (error) {
      console.log('Python file cleanup (non-critical):', error)
    }
    
  } catch (error) {
    console.error('Python cleanup error (non-critical):', error)
  }
}

// Check if Python interpreter is available
export async function checkPythonAvailability(): Promise<{ available: boolean; version?: string; error?: string }> {
  return new Promise((resolve) => {
    const versionCheck = spawn('python3', ['--version'])
    
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
        const versionLine = output.trim() || errorOutput.trim() // Python --version outputs to stderr sometimes
        resolve({ available: true, version: versionLine })
      } else {
        resolve({ available: false, error: errorOutput || 'python3 not found' })
      }
    })
    
    versionCheck.on('error', (error) => {
      resolve({ available: false, error: `python3 not available: ${error.message}` })
    })
    
    // Timeout for version check
    setTimeout(() => {
      versionCheck.kill()
      resolve({ available: false, error: 'Python check timeout' })
    }, 5000)
  })
}

// Install required Python packages if needed
export async function installPythonPackages(packages: string[]): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (packages.length === 0) {
      resolve({ success: true })
      return
    }
    
    console.log('Installing Python packages:', packages)
    
    const pip = spawn('pip3', ['install', ...packages])
    
    let output = ''
    let errorOutput = ''
    
    pip.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    pip.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    pip.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: errorOutput || 'Package installation failed' })
      }
    })
    
    pip.on('error', (error) => {
      resolve({ success: false, error: `pip3 not available: ${error.message}` })
    })
    
    // Timeout for package installation
    setTimeout(() => {
      pip.kill()
      resolve({ success: false, error: 'Package installation timeout' })
    }, 60000) // 1 minute timeout for pip install
  })
}

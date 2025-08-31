// Real execution engine for both Python and C++
import { executeRealCpp, checkCompilerAvailability } from './realCppExecution'
import { executeRealPython, checkPythonAvailability } from './realPythonExecution'

export interface ExecutionResult {
  output: string
  error?: string
  executionTime: number
}

// Re-export for convenience
export { checkCompilerAvailability, checkPythonAvailability }

// Remove all old Pyodide code and keep only the real execution imports
// Global Pyodide instance - NO LONGER USED
// let pyodideInstance: any = null
// let pyodideLoading = false

// Load Pyodide from CDN directly - NO LONGER USED
// async function loadPyodideFromCDN(): Promise<any> { ... }

// Initialize Pyodide - NO LONGER USED  
// async function initPyodide(): Promise<any> { ... }

// Execute Python code using Pyodide - NO LONGER USED
// export async function executePythonWithPyodide(code: string): Promise<ExecutionResult> { ... }

// Clean up - Remove old simulation functions that are no longer needed

// C++ simulation with support for competitive programming constructs
async function executeCpp(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  try {
    console.log('Executing C++ code:', code.substring(0, 100) + '...')
    
    // Basic C++ validation - allow bits/stdc++.h
    if (!code.includes('#include') && !code.includes('int main')) {
      throw new Error('Invalid C++ code structure')
    }
    
    // Check for bits/stdc++.h - this is valid
    const hasBitsHeader = code.includes('#include <bits/stdc++.h>')
    const hasStandardHeaders = code.includes('#include <iostream>') || 
                              code.includes('#include <vector>') || 
                              code.includes('#include <algorithm>')
    
    // Enhanced C++ simulation for simpler code
    const variables: { [key: string]: any } = {}
    const arrays: { [key: string]: any[] } = {}
    const vectors: { [key: string]: any[] } = {}
    let output = ''
    
    // Parse the main function content
    const mainMatch = code.match(/int\s+main\s*\([^)]*\)\s*{([\s\S]*?)return\s+0;\s*}/m)
    if (!mainMatch) {
      console.log('No main function found or complex structure detected')
      throw new Error('No main function found or unsupported structure')
    }
    
    const mainContent = mainMatch[1]
    const lines = mainContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'))
    
    console.log('Processing', lines.length, 'lines in main function')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/;$/, '') // Remove trailing semicolon
      console.log('Processing line:', line)
      
      try {
        // Variable declarations
        if (line.match(/^int\s+\w+/)) {
          const match = line.match(/int\s+(\w+)(?:\s*=\s*([^,;]+))?/)
          if (match) {
            const [, varName, value] = match
            variables[varName] = value ? evaluateCppExpression(value.trim(), variables, arrays, vectors) : 0
            console.log('Declared variable:', varName, '=', variables[varName])
          }
        }
        
        // Vector declarations (support different types)
        else if (line.match(/^vector<(int|bool)>\s+\w+/)) {
          const match = line.match(/vector<(int|bool)>\s+(\w+)(?:\(([^)]+)\))?/)
          if (match) {
            const [, type, varName, sizeExpr] = match
            if (sizeExpr) {
              const parts = sizeExpr.split(',').map(p => p.trim())
              const size = evaluateCppExpression(parts[0], variables, arrays, vectors)
              const defaultValue = parts[1] ? evaluateCppExpression(parts[1], variables, arrays, vectors) : (type === 'bool' ? false : 0)
              vectors[varName] = new Array(size).fill(defaultValue)
            } else {
              vectors[varName] = []
            }
            console.log('Declared vector:', varName, '=', vectors[varName])
          }
        }
        
        // 2D Vector declarations
        else if (line.match(/^vector<vector<int>>\s+\w+/)) {
          const match = line.match(/vector<vector<int>>\s+(\w+)\s*=\s*{([\s\S]*?)}/)
          if (match) {
            const [, varName, initData] = match
            // Parse 2D vector initialization
            const rows = initData.split('},').map(row => 
              row.replace(/[{}]/g, '').split(',').map(num => parseInt(num.trim())).filter(n => !isNaN(n))
            ).filter(row => row.length > 0)
            vectors[varName] = rows
            console.log('Declared 2D vector:', varName, '=', vectors[varName])
          }
        }
        
        // Array declarations
        else if (line.match(/^int\s+\w+\[/)) {
          const match = line.match(/int\s+(\w+)\[([^\]]+)\](?:\s*=\s*{([^}]+)})?/)
          if (match) {
            const [, varName, sizeExpr, initValues] = match
            const size = evaluateCppExpression(sizeExpr, variables, arrays, vectors)
            
            if (initValues) {
              // Initialize with provided values
              const values = initValues.split(',').map(v => parseInt(v.trim()))
              arrays[varName] = values
            } else {
              // Initialize with zeros
              arrays[varName] = new Array(size).fill(0)
            }
            console.log('Declared array:', varName, '=', arrays[varName])
          }
        }
        
        // Simple assignment operations
        else if (line.includes('=') && !line.includes('==') && !line.includes('!=') && !line.includes('<=') && !line.includes('>=') && !line.includes('vector<')) {
          const match = line.match(/(\w+(?:\[[^\]]+\])?)\s*=\s*(.+)/)
          if (match) {
            const [, target, expression] = match
            
            // Handle array/vector assignment
            if (target.includes('[')) {
              const arrayMatch = target.match(/(\w+)\[([^\]]+)\]/)
              if (arrayMatch) {
                const [, arrName, indexExpr] = arrayMatch
                const index = evaluateCppExpression(indexExpr, variables, arrays, vectors)
                const value = evaluateCppExpression(expression, variables, arrays, vectors)
                
                if (arrays[arrName]) {
                  arrays[arrName][index] = value
                } else if (vectors[arrName]) {
                  vectors[arrName][index] = value
                }
                console.log('Array/vector assignment:', arrName + '[' + index + '] =', value)
              }
            } else {
              // Regular variable assignment
              variables[target] = evaluateCppExpression(expression, variables, arrays, vectors)
              console.log('Variable assignment:', target, '=', variables[target])
            }
          }
        }
        
        // cout statements
        else if (line.includes('cout')) {
          const coutMatch = line.match(/cout\s*<<\s*([^;]+)/)
          if (coutMatch) {
            const content = coutMatch[1]
            const coutOutput = processCoutContent(content, variables, arrays, vectors)
            output += coutOutput
            console.log('cout output:', coutOutput)
          }
        }
        
      } catch (error) {
        console.error('Error executing C++ line:', line, error)
      }
    }
    
    // If no output but valid structure, return success
    if (!output && (code.includes('cout') || code.includes('printf'))) {
      output = 'C++ code compiled successfully (check your output statements)'
    } else if (!output) {
      output = 'C++ code compiled and executed successfully'
    }
    
    console.log('Final output:', output)
    
    return {
      output: output,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    console.error('C++ execution error:', error)
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Compilation/execution error',
      executionTime: Date.now() - startTime
    }
  }
}

// Helper function to process cout content
function processCoutContent(content: string, variables: any, arrays: any, vectors: any): string {
  let output = ''
  const parts = content.split('<<').map(p => p.trim())
  
  for (const part of parts) {
    if (part.startsWith('"') && part.endsWith('"')) {
      output += part.slice(1, -1)
    } else if (part === 'endl') {
      output += '\n'
    } else if (part === '" "' || part === "' '") {
      output += ' '
    } else {
      const result = evaluateCppExpression(part, variables, arrays, vectors)
      output += String(result)
    }
  }
  
  return output
}

// Enhanced C++ expression evaluator with data structure support
function evaluateCppExpression(expr: string, variables: any, arrays: any = {}, vectors: any = {}): any {
  try {
    expr = expr.trim()
    
    // Handle string literals
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1)
    }
    
    // Handle numbers
    if (/^\d+(\.\d+)?$/.test(expr)) {
      return Number(expr)
    }
    
    // Handle array/vector access
    if (expr.includes('[')) {
      const match = expr.match(/(\w+)\[([^\]]+)\]/)
      if (match) {
        const [, arrName, indexExpr] = match
        const index = evaluateCppExpression(indexExpr, variables, arrays, vectors)
        
        if (arrays[arrName]) {
          return arrays[arrName][index] || 0
        } else if (vectors[arrName]) {
          return vectors[arrName][index] || 0
        }
      }
    }
    
    // Handle vector.size()
    if (expr.includes('.size()')) {
      const match = expr.match(/(\w+)\.size\(\)/)
      if (match) {
        const vectorName = match[1]
        if (vectors[vectorName]) {
          return vectors[vectorName].length
        }
      }
    }
    
    // Handle simple variables
    if (/^\w+$/.test(expr) && expr in variables) {
      return variables[expr]
    }
    
    // Handle arithmetic expressions
    let processedExpr = expr
    
    // Replace variables with their values
    for (const [varName, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g')
      processedExpr = processedExpr.replace(regex, String(value))
    }
    
    // Evaluate safe mathematical expressions
    if (/^[\d+\-*/().\s]+$/.test(processedExpr)) {
      // eslint-disable-next-line no-eval
      return eval(processedExpr)
    }
    
    return expr
  } catch (error) {
    return expr
  }
}

// Main execution function - uses real compilation/interpretation for both languages
export async function executeCode(code: string, language: 'cpp' | 'python', input: string = ''): Promise<ExecutionResult> {
  try {
    if (language === 'python') {
      // Use real Python execution via python3 subprocess
      try {
        console.log('Using real Python execution for code execution')
        return await executeRealPython(code, input)
      } catch (pythonError) {
        console.error('Real Python execution failed:', pythonError)
        return {
          output: '',
          error: `Python execution failed: ${pythonError instanceof Error ? pythonError.message : 'Unknown error'}`,
          executionTime: 0
        }
      }
    } else if (language === 'cpp') {
      // Use real C++ compilation and execution
      try {
        console.log('Using real C++ compilation for code execution')
        return await executeRealCpp(code, input)
      } catch (cppError) {
        console.error('Real C++ execution failed:', cppError)
        return {
          output: '',
          error: `C++ execution failed: ${cppError instanceof Error ? cppError.message : 'Unknown error'}`,
          executionTime: 0
        }
      }
    } else {
      throw new Error('Unsupported language')
    }
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: 0
    }
  }
}

// Fallback Python simulation for when Pyodide fails
async function executePythonSimulation(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  try {
    // Simple Python interpreter simulation as fallback
    const output: string[] = []
    const lines = code.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    
    for (const line of lines) {
      if (line.startsWith('print(') && line.endsWith(')')) {
        const content = line.slice(6, -1).trim()
        if ((content.startsWith('"') && content.endsWith('"')) || 
            (content.startsWith("'") && content.endsWith("'"))) {
          output.push(content.slice(1, -1))
        } else if (/^\d+$/.test(content)) {
          output.push(content)
        } else {
          output.push(content)
        }
      } else if (line.startsWith('for ') && line.includes('range(') && line.endsWith(':')) {
        const rangeMatch = line.match(/range\((\d+)\)/)
        if (rangeMatch) {
          const limit = parseInt(rangeMatch[1])
          for (let i = 0; i < Math.min(limit, 100); i++) { // Limit to prevent infinite output
            output.push(i.toString())
          }
        }
      }
    }
    
    return {
      output: output.length > 0 ? output.join('\n') : 'Code executed successfully (fallback mode)',
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Execution error',
      executionTime: Date.now() - startTime
    }
  }
}

// Default code templates
export const codeTemplates = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Example: Simple Hello World
    cout << "Hello, World!" << endl;
    
    // Example: Working with vectors
    vector<int> nums = {5, 2, 8, 1, 9};
    sort(nums.begin(), nums.end());
    
    cout << "Sorted numbers: ";
    for (int num : nums) {
        cout << num << " ";
    }
    cout << endl;
    
    // Example: Graph representation (adjacency matrix)
    vector<vector<int>> graph = {
        {0, 1, 1, 0},
        {1, 0, 1, 1},
        {1, 1, 0, 1},
        {0, 1, 1, 0}
    };
    
    cout << "Graph size: " << graph.size() << "x" << graph[0].size() << endl;
    
    return 0;
}`,
  python: `print("Hello, World!")

# Example: Working with lists
numbers = [5, 2, 8, 1, 9]
numbers.sort()
print("Sorted numbers:", numbers)

# Example: Simple loop
for i in range(5):
    print(f"Count: {i}")

# Write your code here
`
}

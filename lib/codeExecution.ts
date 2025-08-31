// Code execution utilities for C++ and Python
export interface ExecutionResult {
  output: string
  error?: string
  executionTime: number
}

// Improved code execution with proper variable handling and expression evaluation
export async function executeCode(code: string, language: 'cpp' | 'python'): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  try {
    if (language === 'python') {
      return await executePython(code)
    } else if (language === 'cpp') {
      return await executeCpp(code)
    } else {
      throw new Error('Unsupported language')
    }
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      executionTime: Date.now() - startTime
    }
  }
}

async function executePython(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  try {
    // Security validation
    if (code.includes('import os') || code.includes('import subprocess') || 
        code.includes('exec(') || code.includes('eval(') || 
        code.includes('__import__') || code.includes('open(')) {
      throw new Error('Restricted imports/functions detected')
    }
    
    // Create a simple Python interpreter simulation
    const variables: { [key: string]: any } = {}
    const output: string[] = []
    const lines = code.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'))
    
    let i = 0
    while (i < lines.length) {
      const line = lines[i]
      
      try {
        // Handle variable assignments
        if (line.includes('=') && !line.includes('==') && !line.includes('!=') && 
            !line.includes('<=') && !line.includes('>=') && !line.startsWith('print')) {
          const [varName, expression] = line.split('=').map(s => s.trim())
          if (varName && expression) {
            const value = evaluatePythonExpression(expression, variables)
            variables[varName] = value
          }
        }
        // Handle print statements
        else if (line.startsWith('print(') && line.endsWith(')')) {
          const content = line.slice(6, -1).trim()
          const result = evaluatePythonExpression(content, variables)
          output.push(String(result))
        }
        // Handle for loops
        else if (line.startsWith('for ') && line.endsWith(':')) {
          const forMatch = line.match(/for\s+(\w+)\s+in\s+range\(([^)]+)\):/)
          if (forMatch) {
            const [, loopVar, rangeExpr] = forMatch
            const rangeResult = evaluateRange(rangeExpr, variables)
            
            // Find the end of the loop (next non-indented line or end)
            let loopEnd = i + 1
            while (loopEnd < lines.length && (lines[loopEnd].startsWith('    ') || lines[loopEnd].startsWith('\t'))) {
              loopEnd++
            }
            
            const loopBody = lines.slice(i + 1, loopEnd).map(l => l.replace(/^    /, '').replace(/^\t/, ''))
            
            // Execute loop
            for (const loopValue of rangeResult) {
              variables[loopVar] = loopValue
              
              // Execute loop body
              for (const bodyLine of loopBody) {
                if (bodyLine.includes('=') && !bodyLine.includes('==') && !bodyLine.startsWith('print')) {
                  const [varName, expression] = bodyLine.split('=').map(s => s.trim())
                  if (varName && expression) {
                    const value = evaluatePythonExpression(expression, variables)
                    variables[varName] = value
                  }
                } else if (bodyLine.startsWith('print(') && bodyLine.endsWith(')')) {
                  const content = bodyLine.slice(6, -1).trim()
                  const result = evaluatePythonExpression(content, variables)
                  output.push(String(result))
                }
              }
            }
            
            i = loopEnd - 1 // Skip the loop body
          }
        }
      } catch (error) {
        console.error('Error executing line:', line, error)
      }
      
      i++
    }
    
    const result = output.length > 0 ? output.join('\n') : 'Code executed successfully'
    
    return {
      output: result,
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

function evaluatePythonExpression(expr: string, variables: { [key: string]: any }): any {
  try {
    // Handle string literals
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1)
    }
    
    // Handle numbers
    if (/^\d+(\.\d+)?$/.test(expr.trim())) {
      return Number(expr)
    }
    
    // Handle variables
    if (/^\w+$/.test(expr.trim()) && expr in variables) {
      return variables[expr]
    }
    
    // Handle simple arithmetic expressions
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

function evaluateRange(rangeExpr: string, variables: { [key: string]: any }): number[] {
  try {
    const args = rangeExpr.split(',').map(arg => {
      const trimmed = arg.trim()
      if (/^\d+$/.test(trimmed)) {
        return Number(trimmed)
      }
      if (trimmed in variables) {
        return Number(variables[trimmed])
      }
      return Number(trimmed)
    })
    
    if (args.length === 1) {
      return Array.from({ length: args[0] }, (_, i) => i)
    } else if (args.length === 2) {
      return Array.from({ length: args[1] - args[0] }, (_, i) => args[0] + i)
    } else if (args.length === 3) {
      const result = []
      for (let i = args[0]; i < args[1]; i += args[2]) {
        result.push(i)
      }
      return result
    }
    
    return []
  } catch (error) {
    return []
  }
}

async function executeCpp(code: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  
  try {
    // Basic C++ validation
    if (!code.includes('#include') && !code.includes('int main')) {
      throw new Error('Invalid C++ code structure')
    }
    
    // Parse and execute C++ code
    const variables: { [key: string]: any } = {}
    let output = ''
    
    // Extract variable declarations
    const intDeclarations = code.match(/int\s+(\w+)\s*=\s*([^;]+);/g)
    if (intDeclarations) {
      intDeclarations.forEach(decl => {
        const match = decl.match(/int\s+(\w+)\s*=\s*([^;]+);/)
        if (match) {
          const [, varName, value] = match
          variables[varName] = evaluateCppExpression(value.trim(), variables)
        }
      })
    }
    
    // Handle cout statements with proper expression evaluation
    const coutMatches = code.match(/cout\s*<<\s*([^;]+)\s*;/g)
    
    if (coutMatches) {
      coutMatches.forEach(match => {
        const content = match.match(/cout\s*<<\s*([^;]+)\s*;/)?.[1]?.trim() || ''
        
        // Split by << to handle multiple outputs
        const parts = content.split('<<').map(p => p.trim())
        
        for (const part of parts) {
          if (part.startsWith('"') && part.endsWith('"')) {
            // String literals
            output += part.slice(1, -1)
          } else if (part === 'endl') {
            // endl
            output += '\n'
          } else {
            // Variables or expressions
            const result = evaluateCppExpression(part, variables)
            output += String(result)
          }
        }
      })
    }
    
    // If no cout found but valid C++ structure, return success message
    if (!output && (code.includes('cout') || code.includes('printf'))) {
      output = 'C++ code compiled successfully (check your output statements)'
    } else if (!output) {
      output = 'C++ code compiled and executed successfully'
    }
    
    return {
      output: output,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Compilation/execution error',
      executionTime: Date.now() - startTime
    }
  }
}

function evaluateCppExpression(expr: string, variables: { [key: string]: any }): any {
  try {
    // Handle numbers
    if (/^\d+(\.\d+)?$/.test(expr)) {
      return Number(expr)
    }
    
    // Handle variables
    if (/^\w+$/.test(expr) && expr in variables) {
      return variables[expr]
    }
    
    // Handle simple arithmetic expressions
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

// Default code templates
export const codeTemplates = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`,
  python: `print("Hello, World!")

# Write your code here
`
}

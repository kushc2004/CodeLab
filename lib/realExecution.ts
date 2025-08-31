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

// Default code templates
export const codeTemplates = {
  cpp: `#include <iostream>
#include <vector>
#include <algorithm>
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

# Example: Working with lists
numbers = [5, 2, 8, 1, 9]
numbers.sort()
print("Sorted numbers:", numbers)

# Example: Simple loop
for i in range(5):
    print(f"Count: {i}")

# Example: Reading input
# Uncomment lines below to test input:
# name = input("Enter your name: ")
# print(f"Hello, {name}!")

# Write your code here
`
}

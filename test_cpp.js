// Test C++ execution logic
import { executeCode } from './lib/codeExecution.js'

const testCode = `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}`

executeCode(testCode, 'cpp').then(result => {
  console.log('Output:', result.output)
  console.log('Error:', result.error)
  console.log('Execution time:', result.executionTime, 'ms')
})

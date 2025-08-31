// Test real C++ execution directly
import { executeRealCpp } from './lib/realCppExecution.js'

const testCode = `#include <bits/stdc++.h>
using namespace std;

bool isSafe(vector<vector<int>>& graph, vector<int>& path, int pos, int v) {
    if (graph[path[pos - 1]][v] == 0)
        return false;
    
    for (int i = 0; i < pos; i++)
        if (path[i] == v)
            return false;
    
    return true;
}

bool hamCycleUtil(vector<vector<int>>& graph, vector<int>& path, int pos) {
    if (pos == 5) {
        return graph[path[pos - 1]][path[0]] == 1;
    }
    
    for (int v = 1; v < 5; v++) {
        if (isSafe(graph, path, pos, v)) {
            path[pos] = v;
            
            if (hamCycleUtil(graph, path, pos + 1))
                return true;
            
            path[pos] = -1;
        }
    }
    
    return false;
}

int main() {
    vector<vector<int>> graph = {
        {0, 1, 0, 1, 1},
        {1, 0, 1, 1, 1},
        {0, 1, 0, 0, 1},
        {1, 1, 0, 0, 1},
        {1, 1, 1, 1, 0}
    };
    
    vector<int> path(5, -1);
    path[0] = 0;
    
    if (hamCycleUtil(graph, path, 1)) {
        for (int i = 0; i < 5; i++)
            cout << path[i] << " ";
        cout << path[0] << endl;
    } else {
        cout << "Solution does not Exist" << endl;
    }
    
    return 0;
}`

console.log('Testing real C++ compilation and execution...')
executeRealCpp(testCode, '').then(result => {
  console.log('=== REAL C++ TEST RESULT ===')
  console.log('Output:', result.output)
  console.log('Error:', result.error)
  console.log('Execution Time:', result.executionTime, 'ms')
  console.log('===============================')
}).catch(error => {
  console.error('Test failed:', error)
})

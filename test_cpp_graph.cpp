// Test C++ code with graph algorithms using bits/stdc++.h
#include <bits/stdc++.h>
using namespace std;

int main() {
    // Test 1: Basic vector and graph operations
    cout << "=== Graph Adjacency List Test ===" << endl;
    
    vector<vector<int>> graph(5);
    
    // Build a simple graph: 0->1->2->3->4->0 (cycle)
    graph[0].push_back(1);
    graph[0].push_back(4);
    graph[1].push_back(2);
    graph[2].push_back(3);
    graph[3].push_back(4);
    graph[4].push_back(0);
    
    cout << "Graph representation:" << endl;
    for(int i = 0; i < graph.size(); i++) {
        cout << "Node " << i << ": ";
        for(int j = 0; j < graph[i].size(); j++) {
            cout << graph[i][j];
            if(j < graph[i].size() - 1) cout << " ";
        }
        cout << endl;
    }
    
    // Test 2: BFS-like traversal simulation
    cout << "\n=== BFS Traversal Test ===" << endl;
    vector<bool> visited(5, false);
    vector<int> queue;
    
    // Start BFS from node 0
    queue.push_back(0);
    visited[0] = true;
    
    cout << "BFS order: ";
    for(int i = 0; i < queue.size(); i++) {
        int current = queue[i];
        cout << current << " ";
        
        // Add unvisited neighbors
        for(int j = 0; j < graph[current].size(); j++) {
            int neighbor = graph[current][j];
            if(!visited[neighbor]) {
                visited[neighbor] = true;
                queue.push_back(neighbor);
            }
        }
    }
    cout << endl;
    
    // Test 3: Array operations
    cout << "\n=== Array Operations Test ===" << endl;
    int arr[5] = {10, 20, 30, 40, 50};
    
    cout << "Array elements: ";
    for(int i = 0; i < 5; i++) {
        cout << arr[i];
        if(i < 4) cout << " ";
    }
    cout << endl;
    
    // Test 4: Graph edge count
    cout << "\n=== Graph Statistics ===" << endl;
    int totalEdges = 0;
    for(int i = 0; i < graph.size(); i++) {
        totalEdges += graph[i].size();
    }
    cout << "Total edges: " << totalEdges << endl;
    cout << "Nodes: " << graph.size() << endl;
    
    return 0;
}

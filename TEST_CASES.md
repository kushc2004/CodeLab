# Code Execution Test Cases

## Python Test Cases

### Test 1: Basic Loop with Variable Assignment
```python
j = 0
for i in range(0, 10):
    j = j + 1
print(j)
```
**Expected Output**: `10`

### Test 2: Simple Variable and Print
```python
x = 5
y = 3
result = x + y
print(result)
```
**Expected Output**: `8`

### Test 3: String and Number
```python
name = "Python"
version = 3.9
print(name)
print(version)
```
**Expected Output**: 
```
Python
3.9
```

## C++ Test Cases

### Test 1: Variable with Expression
```cpp
#include <iostream>
using namespace std;

int main() {
    int i = 0;
    cout << i+1 << endl;
    return 0;
}
```
**Expected Output**: `1`

### Test 2: Multiple Variables
```cpp
#include <iostream>
using namespace std;

int main() {
    int a = 5;
    int b = 3;
    cout << a + b << endl;
    return 0;
}
```
**Expected Output**: `8`

### Test 3: String and Variable
```cpp
#include <iostream>
using namespace std;

int main() {
    int count = 42;
    cout << "Count: " << count << endl;
    return 0;
}
```
**Expected Output**: `Count: 42`

## Key Improvements Made

1. **Variable Tracking**: Both Python and C++ now properly track variable assignments
2. **Expression Evaluation**: Mathematical expressions like `i+1` and `j = j + 1` are correctly evaluated
3. **Loop Support**: Python for loops with range() are now supported
4. **Better Parsing**: Improved parsing for cout statements and print statements
5. **Error Handling**: Better error messages for debugging

Test these examples in the web application to verify the fixes work correctly!

# Real Code Execution Platform

A LeetCode-style coding platform with **real Python and C++ execution** using Docker for Google Cloud Run deployment.

## 🚀 Features

- **Real Python Execution**: Uses `python3` subprocess for authentic Python code execution
- **Real C++ Compilation**: Uses `g++` compiler for actual C++ compilation and execution  
- **Input Support**: Both languages support stdin input for interactive programs
- **Secure Execution**: Timeouts, resource limits, and temporary file cleanup
- **Docker Ready**: Optimized for Google Cloud Run deployment
- **Keystroke Tracking**: Time-windowed keystroke analytics for research
- 🚀 **Simple Login**: Phone number-based authentication (no OTP required)
- 💻 **Code Editor**: Monaco Editor with syntax highlighting for Python and C++
- 📊 **Keystroke Tracking**: Captures every keystroke with timestamps for research
- 💾 **Auto-save**: Automatic session saving every 30 seconds
- 🔒 **Data Consent**: Clear consent banner for data collection
- 📱 **Responsive Design**: Works on desktop and mobile devices

## 🏗️ Architecture

### Execution Engines
- **Python**: `python3` subprocess execution via `realPythonExecution.ts`
- **C++**: `g++` compilation + binary execution via `realCppExecution.ts`
- **API**: Unified execution endpoint with health checks

### Docker Container
- **Base**: Node.js 18 on Ubuntu (Bullseye)
- **Compilers**: `g++`, `gcc`, `python3`, `pip3`
- **Security**: Non-root user, resource limits, timeouts
- **Health**: Built-in health check endpoint

## Tech Stack

- **Frontend & Backend**: Next.js 14 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Code Editor**: Monaco Editor
- **Styling**: Tailwind CSS
- **Code Execution**: Real server-side execution with Docker containerization

## 🛠️ Local Development

### Prerequisites
```bash
# Install required system dependencies
# macOS
brew install node python3 gcc

# Ubuntu/Debian  
sudo apt-get install nodejs npm python3 python3-pip g++ gcc
```

### Setup
```bash
# Clone and install
git clone <repository>
cd CodingPlatform
npm install

# Set up Supabase
# 1. Create a new project on Supabase
# 2. Run the SQL schema from database/schema.sql
# 3. Get your project URL and anon key

# Create .env.local file:
echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env.local

# Start development server
npm run dev
```

### Test Real Execution
```bash
# Test both languages
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello from real Python!\")",
    "language": "python"
  }'

curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "#include <iostream>\nusing namespace std;\nint main() { cout << \"Hello from real C++!\" << endl; return 0; }",
    "language": "cpp"
  }'
```

## 🐳 Docker Deployment

### Build and Test Locally
```bash
# Build Docker image
docker build -t coding-platform .

# Test container locally
docker run -p 3000:3000 coding-platform

# Or use docker-compose
docker-compose up --build
```

### Deploy to Google Cloud Run

#### Prerequisites
```bash
# Install Google Cloud CLI
gcloud auth login
gcloud config set project YOUR-PROJECT-ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

#### Automated Deployment
```bash
# Update deploy.sh with your project ID
vim deploy.sh  # Change PROJECT_ID

# Deploy
./deploy.sh
```

#### Manual Deployment
```bash
# Build and push image
docker build -t gcr.io/YOUR-PROJECT-ID/coding-platform .
docker push gcr.io/YOUR-PROJECT-ID/coding-platform

# Deploy to Cloud Run
gcloud run deploy coding-platform \
  --image gcr.io/YOUR-PROJECT-ID/coding-platform \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --port 3000
```

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production          # Production mode
NEXT_TELEMETRY_DISABLED=1   # Disable Next.js telemetry
PORT=3000                   # Server port (Cloud Run sets this)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Resource Limits (Cloud Run)
- **Memory**: 2GB (for compilation processes)
- **CPU**: 2 vCPU (for concurrent compilation)
- **Timeout**: 300s (for complex algorithms)
- **Concurrency**: 10 max instances

## 🏥 Health Monitoring

### Health Check Endpoint
```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-31T...",
  "services": {
    "python": {
      "available": true,
      "version": "Python 3.11.2"
    },
    "cpp": {
      "available": true, 
      "version": "gcc version 11.2.0"
    }
  }
}
```

## 🔒 Security Features

### Code Execution Security
- **Timeouts**: 30s Python, 30s compilation + 10s execution for C++
- **Resource Limits**: Memory and CPU constraints
- **File Isolation**: Temporary files with unique session IDs
- **Process Isolation**: Separate subprocess for each execution
- **Input Sanitization**: Safe handling of user input

### Docker Security
- **Non-root User**: Runs as `nextjs` user (UID 1001)
- **Minimal Base**: Only essential packages installed
- **No Network**: Can be run with `--network=none` for isolation

### Database Security
- Row Level Security (RLS) enabled on all tables
- Input validation for code execution
- HTTPS required for production
- Regular security audits recommended

## 📊 Performance

### Execution Times
- **Python**: ~50-500ms (depending on code complexity)
- **C++ Compilation**: ~200-2000ms (including compilation + execution)
- **Memory Usage**: ~100-500MB per container instance

### Scaling
- **Cold Start**: ~2-5s (Docker container initialization)
- **Warm Requests**: ~50-500ms
- **Concurrent Users**: 100+ (with auto-scaling)

## 🧪 Testing Complex Algorithms

The platform now supports real execution of complex competitive programming algorithms:

### Hamiltonian Cycle (C++)
```cpp
#include <bits/stdc++.h>
using namespace std;

bool isSafe(vector<vector<int>>& graph, vector<int>& path, int pos, int v) {
    if (graph[path[pos - 1]][v] == 0) return false;
    for (int i = 0; i < pos; i++)
        if (path[i] == v) return false;
    return true;
}

bool hamCycleUtil(vector<vector<int>>& graph, vector<int>& path, int pos) {
    if (pos == 5) return graph[path[pos - 1]][path[0]] == 1;
    
    for (int v = 1; v < 5; v++) {
        if (isSafe(graph, path, pos, v)) {
            path[pos] = v;
            if (hamCycleUtil(graph, path, pos + 1)) return true;
            path[pos] = -1;
        }
    }
    return false;
}

int main() {
    vector<vector<int>> graph = {
        {0, 1, 0, 1, 1}, {1, 0, 1, 1, 1}, {0, 1, 0, 0, 1},
        {1, 1, 0, 0, 1}, {1, 1, 1, 1, 0}
    };
    
    vector<int> path(5, -1);
    path[0] = 0;
    
    if (hamCycleUtil(graph, path, 1)) {
        for (int i = 0; i < 5; i++) cout << path[i] << " ";
        cout << path[0] << endl;
    } else {
        cout << "Solution does not Exist" << endl;
    }
    return 0;
}
```

**Output**: `0 1 2 4 3 0` (real algorithm result!)

### Python Data Science Example
```python
import math
import statistics

def analyze_data(data):
    return {
        'mean': statistics.mean(data),
        'median': statistics.median(data),
        'std_dev': statistics.stdev(data),
        'variance': statistics.variance(data)
    }

data = [1, 2, 3, 4, 5, 10, 15, 20]
result = analyze_data(data)
for key, value in result.items():
    print(f"{key}: {value:.2f}")
```

**Output**: Real statistical calculations with proper library support!

## User Flow

1. **Consent Banner**: User sees data collection consent and accepts
2. **Login**: User enters phone number and clicks "Start Coding"
3. **Code Editor**: User gets access to the code editor with Python/C++ support
4. **Coding**: User writes code while keystrokes are automatically tracked
5. **Execution**: User clicks "Run Code" to see output
6. **Auto-save**: Session data is automatically saved

## Database Schema

### Tables

- **users**: Store user information (phone numbers)
- **sessions**: Store coding sessions with code and language
- **keystrokes**: Store detailed keystroke data for research
- **code_executions**: Store code execution history with outputs

### Data Captured

- Every keystroke with precise timestamp (DateTime format)
- Cursor position for each keystroke
- Code snapshots at each keystroke
- Complete execution history
- Session duration and patterns

## 🚀 Production Deployment

Your platform is now ready for production deployment with:

✅ **Real Python & C++ Execution**  
✅ **Docker Containerization**  
✅ **Google Cloud Run Ready**  
✅ **Security & Resource Management**  
✅ **Health Monitoring**  
✅ **Scalable Architecture**

Deploy with `./deploy.sh` and your LeetCode-style platform will be live with authentic code execution capabilities!

## User Flow

1. **Consent Banner**: User sees data collection consent and accepts
2. **Login**: User enters phone number and clicks "Start Coding"
3. **Code Editor**: User gets access to the code editor with Python/C++ support
4. **Real Execution**: User writes code and runs it with authentic compilation/interpretation
5. **Auto-save**: Session data is automatically saved

## Database Schema

### Tables

- **users**: Store user information (phone numbers)
- **sessions**: Store coding sessions with code and language
- **keystrokes**: Store detailed keystroke data for research (time-windowed)
- **code_executions**: Store code execution history with real outputs

### Data Captured

- Time-windowed keystroke data (100ms intervals) optimized for LSTM models
- Cursor position and code evolution patterns
- Complete execution history with real compilation/execution results
- Session duration and coding behavior patterns

## Research Data & Analytics

The platform captures comprehensive coding behavior data optimized for machine learning research:

- **Time-Windowed Keystrokes**: 100ms/500ms intervals perfect for LSTM training
- **Real Execution Patterns**: How users debug and iterate with actual compiler feedback
- **Language Learning**: Comparative analysis between Python and C++ coding behaviors
- **Algorithm Implementation**: Real algorithm execution patterns and debugging approaches

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker locally
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For questions or issues:
1. Check the GitHub Issues
2. Create a new issue with detailed description
3. Contact the development team

## Future Enhancements

- [ ] Problem database integration
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Additional programming languages (Java, JavaScript)
- [ ] Code sharing and social features
- [ ] Competitive programming contests
- [ ] Advanced LSTM model integration for keystroke prediction

## Research Data

The platform captures comprehensive coding behavior data:

- **Keystroke Patterns**: Every key press/release with precise timing
- **Coding Flow**: How users write, edit, and debug code
- **Language Preferences**: Usage patterns between Python and C++
- **Problem-Solving Approaches**: Code evolution over time
- **Error Patterns**: Common mistakes and correction methods

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For questions or issues:
1. Check the GitHub Issues
2. Create a new issue with detailed description
3. Contact the development team

## Future Enhancements

- [ ] Problem database integration
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Multiple programming languages
- [ ] Code sharing features
- [ ] Leaderboards and achievements
- [ ] Mobile app development

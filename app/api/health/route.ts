// Health check endpoint for Docker and Cloud Run
import { NextRequest, NextResponse } from 'next/server'
import { checkCompilerAvailability, checkPythonAvailability } from '@/lib/realExecution'

export async function GET(request: NextRequest) {
  try {
    // Basic health check
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        python: { available: false, version: '' },
        cpp: { available: false, version: '' }
      }
    }

    // Check Python availability
    try {
      const pythonCheck = await checkPythonAvailability()
      health.services.python = {
        available: pythonCheck.available,
        version: pythonCheck.version || pythonCheck.error || 'unknown'
      }
    } catch (error) {
      health.services.python = {
        available: false,
        version: 'check failed'
      }
    }

    // Check C++ compiler availability
    try {
      const cppCheck = await checkCompilerAvailability()
      health.services.cpp = {
        available: cppCheck.available,
        version: cppCheck.version || cppCheck.error || 'unknown'
      }
    } catch (error) {
      health.services.cpp = {
        available: false,
        version: 'check failed'
      }
    }

    // Return 500 if critical services are not available
    if (!health.services.python.available || !health.services.cpp.available) {
      return NextResponse.json(health, { status: 500 })
    }

    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

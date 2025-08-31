#!/bin/bash

# Print environment variables for debugging
echo "🔍 Runtime Environment Variables:"
echo "NODE_ENV: production"
echo "PORT: 8080"
echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Start the Next.js application
exec npm start

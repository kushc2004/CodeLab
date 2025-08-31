# Use Node.js 18 with Ubuntu base for better package support
FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies for C++ and Python
RUN apt-get update && apt-get install -y \
    g++ \
    gcc \
    python3 \
    python3-pip \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Verify installations
RUN g++ --version && python3 --version

# Copy package files
COPY package*.json ./

# Install Node.js dependencies (including devDependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Build the Next.js application with placeholder env vars for build time
ARG NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Create non-root user for security
RUN useradd -r -g daemon -u 1001 nextjs && \
    chown -R nextjs:daemon /app

# Switch to non-root user
USER nextjs

# Expose port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application with startup script
CMD ["./start.sh"]

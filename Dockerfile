# Multi-stage builder: run Java/TeaVM build then prepare Node runtime
# Stage 1: build the Java WASM scaffold
FROM gradle:8.6-jdk17 AS builder
WORKDIR /home/project
COPY . .
# Run unit tests and generate src/wasm/generated/wasm-gc/*
RUN gradle -p src/rendering/java test buildWasmGC --no-daemon

# Stage 2: Node runtime to serve the app statically for browser-based testing
FROM node:18-bullseye
WORKDIR /usr/src/app
# Copy project files from builder stage
COPY --from=builder /home/project .

# Install npm dependencies (only necessary if you plan to run node scripts)
# Keep this step optional/non-fatal
RUN if [ -f package.json ]; then npm install --no-audit --no-fund; fi
# Install a tiny static server for quick local testing
RUN npm install -g http-server@14

EXPOSE 8080

# Default: serve repository root over HTTP (cache disabled)
CMD ["sh", "-c", "http-server -p 8080 -c-1 ."]

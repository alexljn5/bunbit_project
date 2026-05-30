# Multi-stage builder: run Java Gradle tests then prepare Node runtime
# Stage 1: run Gradle tests for the Java scaffold
FROM gradle:8.6-jdk17 AS builder
WORKDIR /home/project
COPY . .
# Run unit tests from the Java subproject (non-fatal to overall build)
RUN gradle -p src/rendering/java test --no-daemon || true

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

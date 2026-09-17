# Stage 1: build WASM
FROM gradle:8.6-jdk17 AS wasm-builder

WORKDIR /home/project

COPY . .

# sanity check (DO NOT override JAVA_HOME)
RUN java -version

# deterministic WASM build
RUN gradle -p src/rendering/java clean buildWasmGC --no-daemon --stacktrace --info


# Stage 2: runtime (web version for Docker)
FROM node:18-bullseye

WORKDIR /usr/src/app

# Copy WASM artifacts from builder
COPY --from=wasm-builder /home/project .

# Install dependencies
RUN if [ -f package.json ]; then npm install --no-audit --no-fund; fi
RUN npm install -g http-server@14

EXPOSE 8080

# For web version in Docker - use http-server
CMD ["http-server", "-p", "8080", "-c-1", "."]
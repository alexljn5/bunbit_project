# Stage 1: build WASM
FROM gradle:8.6-jdk17 AS builder

WORKDIR /home/project

COPY . .

# sanity check (DO NOT override JAVA_HOME)
RUN java -version

# deterministic WASM build
RUN gradle -p src/rendering/java clean buildWasmGC --no-daemon --stacktrace --info


# Stage 2: runtime
FROM node:18-bullseye

WORKDIR /usr/src/app

COPY --from=builder /home/project .

RUN if [ -f package.json ]; then npm install --no-audit --no-fund; fi
RUN npm install -g http-server@14

EXPOSE 8080

CMD ["http-server", "-p", "8080", "-c-1", "."]
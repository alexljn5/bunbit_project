#!/usr/bin/env bash

set -e

IMAGE_NAME="${1:-bunbit_local:debug}"
PORT="${2:-8080}"
RUN_JAVA_TESTS="${RUN_JAVA_TESTS:-false}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"
CONTAINER_NAME="bunbit_engine"

# Colors

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

log_info() {
echo -e "${CYAN}[INFO]${RESET} $1"
}

log_ok() {
echo -e "${GREEN}[OK]${RESET} $1"
}

log_warn() {
echo -e "${YELLOW}[WARN]${RESET} $1"
}

log_evil() {
echo -e "${RED}[BUNBIT]${RESET} $1"
}

cd "$SCRIPT_DIR"


#

# CUSTOM ASCII SECTION

#

echo -e "${RED}"
cat << "EOF"

██████╗ ██╗   ██╗███╗   ██╗██████╗ ██╗████████╗
██╔══██╗██║   ██║████╗  ██║██╔══██╗██║╚══██╔══╝
██████╔╝██║   ██║██╔██╗ ██║██████╔╝██║   ██║
██╔══██╗██║   ██║██║╚██╗██║██╔══██╗██║   ██║
██████╔╝╚██████╔╝██║ ╚████║██████╔╝██║   ██║
╚═════╝  ╚═════╝ ╚═╝  ╚═══╝╚═════╝ ╚═╝   ╚═╝

⛓⛓⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ 
    B U N B I T   E N G I N E
⛓⛓⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ 

EOF
echo -e "${RESET}"

log_evil "Initializing corrupted rabbit core..."
sleep 0.2
log_evil "Loading forbidden raycaster modules..."
sleep 0.2
log_evil "Cream.exe has been located."
sleep 0.2
log_evil "Warning: Bunny integrity compromised."
sleep 0.2

cleanup() {
log_info "Stopping container..."

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

log_evil "Containment successful."

}

trap cleanup EXIT

# Generate the wasm

sh "$SCRIPT_DIR/generate_wasm.sh"
sleep 0.2

#Build wasm
build_wasm_if_needed() {
    log_info "Checking WASM build..."

    LOCAL_WASM="src/wasm/generated/wasm-gc"

    if [ ! -d "$LOCAL_WASM" ] || [ -z "$(ls -A "$LOCAL_WASM" 2>/dev/null)" ]; then
        log_warn "WASM missing. Building via Gradle..."

        cd src/rendering/java

        if [ -f "gradlew" ]; then
            ./gradlew build
        else
            gradle build
        fi

        cd "$SCRIPT_DIR"

        log_ok "WASM build step completed"
    else
        log_ok "WASM already present"
    fi
}

# Wasm sync 

cd "$PROJECT_ROOT/src/rendering/java"

SRC="$PROJECT_ROOT/src/wasm/generated/wasm-gc"
DST="$PROJECT_ROOT/src/wasm/wasm-public"

log_info "Syncing WASM output..."

if [ -d "$SRC" ]; then
    mkdir -p "$DST"
    rm -rf "$DST"/*
    cp -r "$SRC/." "$DST/"
    log_ok "WASM synced"
else
    log_warn "WASM output missing at $SRC"
    exit 1
fi

# Install npm dependencies

if [ ! -d "node_modules" ]; then
log_info "Installing npm dependencies..."
npm install
fi

# Build image only if missing

if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
log_info "Docker image not found."
log_info "Building image: $IMAGE_NAME"

docker build -t "$IMAGE_NAME" .

log_ok "Docker image built."

else
log_ok "Using existing image: $IMAGE_NAME"
fi

# Optional Java tests

if [ "$RUN_JAVA_TESTS" = "true" ]; then
log_info "Running Java tests..."

docker run --rm \
    -v "$(pwd):/home/project" \
    -w /home/project/src/rendering/java \
    gradle:8.6-jdk17 \
    gradle test --no-daemon

log_ok "Java tests passed."

fi

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

log_info "Starting container '$CONTAINER_NAME'..."

docker run -d --name "$CONTAINER_NAME" -p "$PORT:8080" "$IMAGE_NAME"

URL="http://localhost:$PORT/"
ATTEMPTS=0
MAX_ATTEMPTS=30

log_evil "Opening dimensional gateway..."

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do

    if curl -fs "$URL" >/dev/null 2>&1; then
        echo
        log_ok "Server is up at $URL"
        break
    fi

    printf "."
    sleep 1
    ATTEMPTS=$((ATTEMPTS + 1))
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
echo
log_warn "Server did not become ready in time."
fi

log_evil "Raycasting subsystem online."
log_evil "Bunny corruption level: 100%"
log_evil "Launching Electron host..."

npm run start

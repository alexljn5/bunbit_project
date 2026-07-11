#!/usr/bin/env bash

# Bunbit Engine - Tauri Development Script (Merged)
# Usage: ./start_bunbit_engine.sh [options]
# Options:
#   --dev       Start in development mode (tauri dev)
#   --build     Build the production app (tauri build)
#   --wasm      Rebuild WASM only
#   --help      Show this help message

set -e

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

# Show ASCII art
show_ascii() {
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
⛓⛓⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ ⛓ 

EOF
    echo -e "${RESET}"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR" && pwd)"

# Check for required tools
check_requirements() {
    if ! command -v node &> /dev/null; then
        echo "Error: Node.js is required but not installed."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "Error: npm is required but not installed."
        exit 1
    fi

    # If running outside Docker, Rust is required.
    # If running inside Docker image built from our Dockerfile, cargo will exist.
    if [ -z "${BUNBIT_IN_DOCKER:-}" ] && ! command -v cargo &> /dev/null; then
        echo "Error: Rust/Cargo is required but not installed."
        echo "Install from: https://rustup.rs"
        exit 1
    fi
}

# Build WASM only
build_wasm() {
    log_info "Building WASM..."
    if [ -d "src/rendering/java" ]; then
        gradle -p src/rendering/java clean buildWasmGC --no-daemon --stacktrace
    else
        echo "WASM build directory not found, skipping..."
    fi
}

# Sync WASM output
sync_wasm() {
    log_info "Syncing WASM output..."
    
    SRC="$PROJECT_ROOT/src/wasm/generated/wasm-gc"
    DST="$PROJECT_ROOT/src/wasm/wasm-public"
    
    if [ -d "$SRC" ]; then
        mkdir -p "$DST"
        rm -rf "$DST"/*
        cp -r "$SRC/." "$DST/"
        log_ok "WASM synced"
    else
        log_warn "WASM output missing at $SRC"
    fi
}

# Generate WASM
generate_wasm() {
    if [ -f "$SCRIPT_DIR/src/scripts/generate_wasm.sh" ]; then
        sh "$SCRIPT_DIR/src/scripts/generate_wasm.sh"
    fi
}

# Build wasm if needed
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

# Start development server
start_dev() {
    show_ascii
    log_evil "Initializing corrupted rabbit core..."
    sleep 0.2
    log_evil "Loading forbidden raycaster modules..."
    sleep 0.2
    log_evil "Cream.exe has been located."
    sleep 0.2
    log_evil "Warning: Bunny integrity compromised."
    sleep 0.2
    
    # Set WASM_RAY_MATH environment variable
    export WASM_RAY_MATH=true
    
    # Generate and sync WASM
    generate_wasm
    sync_wasm
    
    # Check if we need to build WASM
    if [ ! -d "src/wasm/generated/wasm-gc" ] || [ -z "$(ls -A "src/wasm/generated/wasm-gc" 2>/dev/null)" ]; then
        build_wasm_if_needed
    fi
    
    # Install npm dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
    fi
    
    log_info "Starting Bunbit Engine in development mode..."
    npm run dev
}

# Build production app
build_prod() {
    show_ascii
    log_evil "Initializing corrupted rabbit core..."
    sleep 0.2
    log_evil "Loading forbidden raycaster modules..."
    sleep 0.2
    log_evil "Cream.exe has been located."
    sleep 0.2
    log_evil "Warning: Bunny integrity compromised."
    sleep 0.2
    
    # Set WASM_RAY_MATH environment variable
    export WASM_RAY_MATH=true
    
    # Generate and sync WASM
    generate_wasm
    sync_wasm
    
    # Check if we need to build WASM
    if [ ! -d "src/wasm/generated/wasm-gc" ] || [ -z "$(ls -A "src/wasm/generated/wasm-gc" 2>/dev/null)" ]; then
        build_wasm_if_needed
    fi
    
    # Install npm dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
    fi
    
    log_info "Building Bunbit Engine for production..."
    npm run build
}

# Docker mode
docker_mode() {
    local IMAGE_NAME="${1:-bunbit_local:debug}"
    local PORT="${2:-8080}"
    local RUN_JAVA_TESTS="${RUN_JAVA_TESTS:-false}"
    local CONTAINER_NAME="bunbit_engine"
    
    show_ascii
    log_evil "Initializing corrupted rabbit core..."
    sleep 0.2
    log_evil "Loading forbidden raycaster modules..."
    sleep 0.2
    log_evil "Cream.exe has been located."
    sleep 0.2
    log_evil "Warning: Bunny integrity compromised."
    sleep 0.2
    
    # Set WASM_RAY_MATH environment variable
    export WASM_RAY_MATH=true
    
    # Generate WASM
    generate_wasm
    sync_wasm
    
    # Build wasm if needed
    build_wasm_if_needed
    
    # Install npm dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
    fi
    
    # Build image only if missing
    if ! docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
        log_info "Docker image not found."
        log_info "Building image: $IMAGE_NAME"
        docker build --pull -t "$IMAGE_NAME" .
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
    log_evil "Launching Tauri host..."
    
    # Start Tauri dev in Docker
    npm run dev
}

# Show help
show_help() {
    show_ascii
    echo "Bunbit Engine - Tauri Development Script"
    echo ""
    echo "Usage: ./start_bunbit_engine.sh [options]"
    echo ""
    echo "Options:"
    echo "  --dev       Start in development mode (tauri dev)"
    echo "  --build     Build the production app (tauri build)"
    echo "  --wasm      Rebuild WASM only"
    echo "  --help      Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  WASM_RAY_MATH=true  Enable WASM ray math"
    echo "  DEBUG=true          Enable debug mode"
    echo "  BUNBIT_IN_DOCKER    Set to 'true' when running in Docker container"
}

# Main
check_requirements

# Docker mode:
# - Default behavior: do NOT try to rebuild WASM because gradle isn't installed in this runtime image.
# - WASM rebuild is only attempted if you explicitly have gradle available.
if [ -n "${BUNBIT_IN_DOCKER:-}" ]; then
    case "${1:-}" in
        --wasm)
            if command -v gradle >/dev/null 2>&1; then
                build_wasm
            else
                log_warn "gradle not found in container runtime; skipping --wasm rebuild"
            fi
            ;;
        --help|-h|"" ) show_help ;;
        --dev) docker_mode ;;
        --build) build_prod ;;
        *) show_help ;;
    esac
    exit 0
fi

case "${1:-}" in
    --dev)
        start_dev
        ;;
    --build)
        build_prod
        ;;
    --wasm)
        build_wasm
        ;;
    --help|*)
        show_help
        ;;
esac

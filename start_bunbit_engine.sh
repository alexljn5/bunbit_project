#!/bin/bash

# Bunbit Engine - Tauri Development Script
# Usage: ./start_bunbit_engine.sh [options]
# Options:
#   --dev       Start in development mode
#   --build     Build the production app
#   --wasm      Rebuild WASM only
#   --help      Show this help message

set -e

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
    echo "Building WASM..."
    if [ -d "src/rendering/java" ]; then
        gradle -p src/rendering/java clean buildWasmGC --no-daemon --stacktrace
    else
        echo "WASM build directory not found, skipping..."
    fi
}

# Start development server
start_dev() {
    echo "Starting Bunbit Engine in development mode..."
    npm run dev
}

# Build production app
build_prod() {
    echo "Building Bunbit Engine for production..."
    npm run build
}

# Show help
show_help() {
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
          echo "gradle not found in container runtime; skipping --wasm rebuild"
        fi
        ;;
      --help|-h|"" ) show_help ;;
      --dev) start_dev ;;
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

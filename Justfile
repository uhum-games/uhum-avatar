# Uhum Avatar - Build Commands
# Install 'just' with: cargo install just
# Run commands with: just <command>

# Default: show available commands
default:
    @just --list

# =============================================================================
# Platform Commands
# =============================================================================

# Development server with local Brain: just dev browser [AGENT_ID]
dev platform AGENT_ID="dev.agent":
    @just _dev-{{platform}} "{{AGENT_ID}}"

# Build for production: just build browser <AGENT_ID>
build platform AGENT_ID:
    @just _build-{{platform}} "{{AGENT_ID}}"

# Mock mode - no Brain needed: just mock browser
mock platform:
    @just _mock-{{platform}}

# Install dependencies: just install browser
install platform:
    @just _install-{{platform}}

# Run tests: just test [browser]
test platform="":
    @if [ -z "{{platform}}" ]; then cargo test; else just _test-{{platform}}; fi

# =============================================================================
# Browser Platform (internal recipes)
# =============================================================================

# [internal] Dev with local Brain (ws://localhost:8080)
_dev-browser AGENT_ID="dev.agent":
    #!/usr/bin/env bash
    set -euo pipefail
    
    # Check if dependencies are installed
    if [ ! -d "platforms/browser/node_modules" ]; then
        echo "⚠️  Dependencies not installed. Running: just install browser"
        just _install-browser
    fi
    
    echo "🚀 Starting Avatar dev server..."
    echo "   Agent ID: {{AGENT_ID}}"
    echo "   Brain URL: ws://localhost:8080"
    echo ""
    echo "   Make sure your Brain is running: cd ../uhum-brain && cargo run"
    echo ""
    
    cd platforms/browser && \
        VITE_MOCK_MODE=true \
        VITE_MOCK_WS_URL=ws://localhost:8080 \
        VITE_MOCK_AGENT_ID="{{AGENT_ID}}" \
        pnpm dev

# [internal] Build browser for production
_build-browser AGENT_ID:
    #!/usr/bin/env bash
    set -euo pipefail
    
    # Check if dependencies are installed
    if [ ! -d "platforms/browser/node_modules" ]; then
        echo "⚠️  Dependencies not installed. Running: just install browser"
        just _install-browser
    fi
    
    echo "📦 Building Avatar for agent: {{AGENT_ID}}"
    cd platforms/browser && VITE_AGENT_ID="{{AGENT_ID}}" pnpm build
    echo "✅ Build complete: platforms/browser/app/dist/"

# [internal] Mock mode (no Brain needed)
_mock-browser:
    #!/usr/bin/env bash
    set -euo pipefail
    
    # Check if dependencies are installed
    if [ ! -d "platforms/browser/node_modules" ]; then
        echo "⚠️  Dependencies not installed. Running: just install browser"
        just _install-browser
    fi
    
    echo "🎭 Starting Avatar in mock mode (no Brain required)"
    cd platforms/browser && pnpm dev:mock

# [internal] Install browser dependencies
_install-browser:
    cd platforms/browser && pnpm install

# [internal] Run browser tests
_test-browser:
    cd platforms/browser && pnpm test

# =============================================================================
# Rust Build Commands
# =============================================================================

# Build all Rust crates
build-rust:
    cargo build

# Build in release mode
build-rust-release:
    cargo build --release

# Build WASM for browser (requires wasm-pack)
build-wasm:
    cd crates/ua-wasm && wasm-pack build --target web --out-dir ../../platforms/browser/lib/wasm

# Build WASM in release mode
build-wasm-release:
    cd crates/ua-wasm && wasm-pack build --release --target web --out-dir ../../platforms/browser/lib/wasm

# =============================================================================
# Development
# =============================================================================

# Check code (no build)
check:
    cargo check

# Format code
fmt:
    cargo fmt

# Lint code
lint:
    cargo clippy -- -D warnings

# Clean all build artifacts
clean:
    cargo clean
    rm -rf platforms/browser/lib/wasm
    rm -rf platforms/browser/lib/dist
    rm -rf platforms/browser/app/dist
    rm -rf platforms/browser/node_modules
    rm -rf platforms/browser/lib/node_modules
    rm -rf platforms/browser/app/node_modules

# =============================================================================
# Full Workflows
# =============================================================================

# Setup everything for development
setup: build-rust (install "browser")
    @echo "✅ Setup complete!"

# Build everything for production
all AGENT_ID: build-rust-release build-wasm-release (build "browser" AGENT_ID)
    @echo "✅ Full build complete for agent {{AGENT_ID}}!"

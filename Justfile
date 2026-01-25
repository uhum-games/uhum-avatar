# Uhum Avatar - Build Commands
# Install 'just' with: cargo install just
# Run commands with: just <command>

# Default: show available commands
default:
    @just --list

# =============================================================================
# Build Commands
# =============================================================================

# Build all Rust crates
build:
    cargo build

# Build in release mode
build-release:
    cargo build --release

# Build WASM for browser (requires wasm-pack)
build-wasm:
    cd crates/ua-wasm && wasm-pack build --target web --out-dir ../../platforms/browser/wasm

# Build WASM in release mode
build-wasm-release:
    cd crates/ua-wasm && wasm-pack build --release --target web --out-dir ../../platforms/browser/wasm

# =============================================================================
# Test Commands
# =============================================================================

# Run all tests
test:
    cargo test

# Run tests with output
test-verbose:
    cargo test -- --nocapture

# Run WASM tests in browser (requires wasm-pack)
test-wasm:
    cd crates/ua-wasm && wasm-pack test --headless --chrome

# =============================================================================
# Browser Platform
# =============================================================================

# Install browser package dependencies
browser-install:
    cd platforms/browser && pnpm install

# Build browser TypeScript package
browser-build:
    cd platforms/browser && pnpm run build

# =============================================================================
# Example App
# =============================================================================

# Install example app dependencies
example-install:
    cd platforms/browser/examples/demo && pnpm install

# Run the example app (dev server)
example-dev:
    cd platforms/browser/examples/demo && pnpm run dev

# Run the mock Brain server for example app
example-server:
    cd platforms/browser/examples/demo && node mock-server.js

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

# Clean build artifacts
clean:
    cargo clean
    rm -rf platforms/browser/wasm
    rm -rf platforms/browser/dist
    rm -rf platforms/browser/examples/demo/node_modules

# =============================================================================
# Full Workflows
# =============================================================================

# Setup everything for development
setup: build browser-install example-install
    @echo "✅ Setup complete!"

# Build everything for production
all: build-release build-wasm-release browser-build
    @echo "✅ Full build complete!"

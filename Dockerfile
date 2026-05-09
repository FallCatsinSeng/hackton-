FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV RUSTUP_HOME="/root/.rustup"
ENV CARGO_HOME="/root/.cargo"

# System dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    pkg-config \
    libssl-dev \
    build-essential \
    libudev-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (latest stable — must support Edition 2024, i.e. ≥ 1.85)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup update stable

# Install Node.js via nvm
ENV NVM_DIR="/root/.nvm"
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" \
    && nvm install 22 \
    && nvm use 22 \
    && nvm alias default 22 \
    && npm install -g yarn

# Symlink node/npm to /usr/local/bin (available in non-interactive shells)
RUN ln -sf $(find /root/.nvm/versions/node -name "node" -type f | head -1) /usr/local/bin/node \
    && ln -sf $(find /root/.nvm/versions/node -name "npm" -type f | head -1) /usr/local/bin/npm \
    && ln -sf $(find /root/.nvm/versions/node -name "npx" -type f | head -1) /usr/local/bin/npx \
    && ln -sf $(find /root/.nvm/versions/node -name "yarn" -type f | head -1) /usr/local/bin/yarn 2>/dev/null || true

# Install Solana CLI (Agave stable)
ENV PATH="/root/.local/share/solana/install/active_release/bin:${PATH}"
RUN sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Install Anchor CLI directly from source (bypasses avm download timeout)
# This compiles from git — slower but 100% reliable on bad connections
RUN cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli --force

# Configure Solana for localhost
RUN solana-keygen new --no-bip39-passphrase -o /root/.config/solana/id.json \
    && solana config set --url localhost

# Verify all tools
RUN echo "=== Versions ===" \
    && solana --version \
    && anchor --version \
    && node --version \
    && rustc --version

WORKDIR /workspace

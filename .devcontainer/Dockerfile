FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install essential packages in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    wget \
    ca-certificates \
    # Quarto needs gdebi for .deb installation
    gdebi-core \
    # Playwright browser dependencies (minimal set)
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libxfixes3 \
    && rm -rf /var/lib/apt/lists/*

# Install Quarto
ARG QUARTO_VERSION=1.8.25
RUN wget -q https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-amd64.deb \
    && gdebi --non-interactive quarto-${QUARTO_VERSION}-linux-amd64.deb \
    && rm quarto-${QUARTO_VERSION}-linux-amd64.deb

WORKDIR /workspace

# Set up node user permissions
RUN chown -R node:node /workspace

# Configure git for the container (as node user)
USER node
RUN git config --global --add safe.directory /workspace

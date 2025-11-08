FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install essential packages in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    wget \
    ca-certificates \
    # Quarto needs gdebi for .deb installation
    gdebi-core \
    # Lua for testing Lua filter
    lua5.4 \
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

WORKDIR /workspace

RUN mkdir -p "${PLAYWRIGHT_BROWSERS_PATH}" \
    && npx -y playwright@1.56.1 install --with-deps

# Set up node user permissions
RUN chown -R node:node /workspace "${PLAYWRIGHT_BROWSERS_PATH}"

# Configure git for the container (as node user)
USER node
RUN git config --global --add safe.directory /workspace

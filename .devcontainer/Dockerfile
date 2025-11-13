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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Playwright browsers and system dependencies as root
RUN mkdir -p "${PLAYWRIGHT_BROWSERS_PATH}" \
    && npx -y playwright@1.56.1 install \
    && npx -y playwright@1.56.1 install-deps \
    && chown -R node:node "${PLAYWRIGHT_BROWSERS_PATH}"

# Configure git for the container (as node user)
USER node
RUN git config --global --add safe.directory /workspace

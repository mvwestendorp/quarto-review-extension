FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV JULIA_VERSION=1.12.2

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

# Install Julia from official binaries
RUN cd /tmp && \
    wget -q https://julialang-s3.julialang.org/bin/linux/x64/${JULIA_VERSION%.*}/julia-${JULIA_VERSION}-linux-x86_64.tar.gz && \
    tar -xzf julia-${JULIA_VERSION}-linux-x86_64.tar.gz -C /opt && \
    ln -s /opt/julia-${JULIA_VERSION}/bin/julia /usr/local/bin/julia && \
    rm julia-${JULIA_VERSION}-linux-x86_64.tar.gz

# Install Julia packages for Quarto
RUN julia -e 'using Pkg; Pkg.add(["Plots", "StatsPlots"]); Pkg.precompile()' 2>/dev/null || true

# Configure git for the container (as node user)
USER node
RUN git config --global --add safe.directory /workspace

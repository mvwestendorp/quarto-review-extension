# Development Container

This directory contains the configuration for a VS Code development container that provides a consistent development environment for the Quarto Review Extension.

## What's Included

### Software
- **Node.js 22** (LTS): JavaScript/TypeScript runtime
- **Quarto 1.8.25** (Latest): Document rendering system
- **Git**: Version control
- **Playwright dependencies**: Minimal libraries needed for browser automation

**Note**: This is a streamlined setup focused on extension development. R and Python are not included by default. If you need them for Quarto code blocks, you can install them separately.

### VS Code Extensions
- ESLint - JavaScript/TypeScript linting
- Prettier - Code formatting
- TypeScript - Enhanced TypeScript support
- Quarto - Quarto document support
- Playwright - E2E test runner
- Vitest Explorer - Unit test integration
- Code Spell Checker - Spell checking

### VS Code Settings
- Auto-format on save
- ESLint auto-fix on save
- Consistent line endings (LF)
- TypeScript path configured

## Usage

### Prerequisites
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [VS Code](https://code.visualstudio.com/)
3. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Opening in Dev Container

1. **From VS Code:**
   - Open the project folder
   - Press `F1` and select "Dev Containers: Reopen in Container"
   - Wait for the container to build (first time only)

2. **From Command Palette:**
   - `Ctrl/Cmd + Shift + P`
   - Type "Reopen in Container"
   - Select "Dev Containers: Reopen in Container"

3. **Automatic:**
   - VS Code will prompt you to reopen in container when you open the folder

### First Run

The container will automatically:
1. Install npm dependencies (`npm install`)
2. Install Playwright browsers (`npx playwright install --with-deps chromium`)

This happens via the `postCreateCommand` in `devcontainer.json`.

## Development Workflow

Once inside the container:

```bash
# Start development server (with watch mode)
npm run dev

# Run tests
npm test
npm run test:e2e

# Build the extension
npm run build

# Render example Quarto document
cd example
quarto render document.qmd
quarto preview document.qmd

# Lint and format
npm run lint
npm run format
```

## Ports

The following ports are automatically forwarded:

- **5173**: Vite development server
- **3000**: Quarto preview server

You can access them at `http://localhost:5173` and `http://localhost:3000` from your host machine.

## SSH Keys

Your SSH keys from `~/.ssh` are mounted read-only into the container, allowing you to:
- Push/pull from git repositories
- Use SSH authentication with GitHub/GitLab/etc.

## Customization

### Adding VS Code Extensions

Edit `.devcontainer/devcontainer.json`:

```json
"customizations": {
  "vscode": {
    "extensions": [
      "existing.extension",
      "your.new-extension"
    ]
  }
}
```

### Installing Additional Software

To add packages like Python or R, edit `.devcontainer/Dockerfile`:

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    r-base \
    && rm -rf /var/lib/apt/lists/*
```

Then rebuild the container.

### Changing Quarto Version

Edit `.devcontainer/Dockerfile`:

```dockerfile
ARG QUARTO_VERSION=1.8.25  # Change this to desired version
```

Check [Quarto Releases](https://github.com/quarto-dev/quarto-cli/releases) for available versions.

## Rebuilding the Container

If you modify the Dockerfile or devcontainer.json:

1. Press `F1`
2. Select "Dev Containers: Rebuild Container"
3. Wait for rebuild to complete

## Troubleshooting

### Container Won't Start

1. Check Docker Desktop is running
2. Check Docker has enough resources (4GB+ RAM recommended)
3. Try rebuilding: "Dev Containers: Rebuild Container"

### npm install Fails

1. Delete `node_modules` folder
2. Rebuild container
3. Check internet connection

### Playwright Tests Fail

1. Ensure browsers are installed: `npx playwright install --with-deps`
2. Check system dependencies are present (already in Dockerfile)

### Quarto Command Not Found

1. Verify Quarto is in PATH: `which quarto`
2. Try reinstalling: Rebuild container

### Permission Issues

The container runs as the `node` user (non-root). If you encounter permission issues:

```bash
# Fix ownership (run from inside container)
sudo chown -R node:node /workspace
```

## Performance Tips

### Use Named Volumes

For better I/O performance on macOS/Windows:

1. Edit `devcontainer.json`
2. Add volume mount:

```json
"mounts": [
  "source=quarto-review-node-modules,target=${containerWorkspaceFolder}/node_modules,type=volume"
]
```

### Exclude Folders from Sync

Add to your `.gitignore` to prevent syncing to container:
- `node_modules/`
- `dist/`
- `.cache/`

## Additional Resources

- [VS Code Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Quarto Documentation](https://quarto.org/)
- [Playwright Documentation](https://playwright.dev/)

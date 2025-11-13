# Local Development Workflow

This guide shows how to develop and test the Quarto Review Extension locally without deploying to infrastructure.

## Quick Start

### 1. Build and watch for changes
```bash
npm run dev
```

This starts Vite in watch mode, rebuilding on every file change. The build artifacts are automatically copied to `_extensions/review/assets/`.

### 2. In another terminal, serve the example site
```bash
npm run serve:e2e
```

This starts a local HTTP server on `http://127.0.0.1:5173` serving the pre-rendered example HTML files.

### 3. Open in browser
Visit: **http://127.0.0.1:5173**

Changes to TypeScript files will rebuild in ~1-2 seconds, and you can refresh the browser to see changes immediately.

## Testing User Authentication

### Option 1: Inject Test Headers (Recommended)

The easiest way to test OAuth2-proxy authentication locally is to inject test headers into the example HTML:

```bash
# After rendering the example
quarto render example/

# Then inject test OAuth2-proxy headers
node scripts/inject-test-headers.js

# Run dev workflow
npm run dev    # Terminal 1
npm run serve:e2e  # Terminal 2

# Visit http://127.0.0.1:5173
```

This injects these test headers into the HTML:
- `x-auth-request-user: test.user`
- `x-auth-request-email: test@example.com`
- `x-auth-request-preferred-username: test.user`

The user will automatically authenticate on page load.

### Option 2: Manual Header Injection

To inject headers into specific files:

```bash
# Inject only into document.html
node scripts/inject-test-headers.js document

# Inject into all HTML files
node scripts/inject-test-headers.js
```

### Option 3: Browser DevTools Console

You can manually create a test user directly in the console without headers:

```javascript
// In browser console (F12)
const quarto = window.__quarto?.instance;
const userModule = quarto?.user;

if (userModule) {
  // Create a test user
  const testUser = {
    id: 'dev-user',
    name: 'Dev User',
    email: 'dev@example.com',
    role: 'editor'
  };

  userModule.login?.(testUser);

  // Verify
  console.log('Current user:', userModule.getCurrentUser?.());

  // The sidebar should now show user info with 👤 icon
}
```

## Development Workflow for Debugging

### 1. Enable Full Debug Logging

```javascript
// In browser console
localStorage.setItem('debug', '*');
location.reload();
```

Now all modules will log detailed debug information to the console.

### 2. Check User Authentication Status

```javascript
// Quick check
const userModule = window.__quarto?.userModule;
console.log('Is authenticated:', userModule?.isAuthenticated?.());
console.log('Current user:', userModule?.getCurrentUser?.());
console.log('OAuth2 config:', userModule?.getOAuth2ProxyConfig?.());
```

### 3. Check Available Headers

```javascript
// See which OAuth2-proxy headers are available
const headers = Array.from(document.querySelectorAll('meta[name^="x-"]'));
headers.forEach(meta => {
  console.log(`${meta.getAttribute('name')}: ${meta.getAttribute('content')}`);
});
```

### 4. Trigger OAuth2-Proxy Login Manually

```javascript
// If headers are present but user didn't auto-login
const userModule = window.__quarto?.userModule;
userModule?.loginFromOAuth2ProxyHeaders?.();
console.log('Current user:', userModule?.getCurrentUser?.());
```

## Fast Iteration Loop

### For TypeScript Changes

1. **Edit** TypeScript file in `src/`
2. **Watch terminal** shows "✓ [built in Xms]"
3. **Browser** - Press F5 to refresh
4. **Console** - Check for errors/logs

Typical cycle: Edit → 1-2 seconds build → Refresh → See changes

### For Adding Features

Example: Testing sidebar user display

```bash
# Start development environment
npm run dev              # Terminal 1: Watch/rebuild
npm run serve:e2e       # Terminal 2: Local server

# Inject test user headers
node scripts/inject-test-headers.js

# In browser: http://127.0.0.1:5173/document.html
# Should see: 👤 test.user in sidebar footer

# Edit sidebar code in src/modules/ui/sidebars/UnifiedSidebar.ts
# Save → Rebuild → F5 in browser → See changes

# Check console:
window.__quarto?.userModule?.getCurrentUser?.()
```

## Using Development Config

A development-specific Quarto config is available at `example/_quarto-dev.yml`:

```yaml
review:
  user:
    auth:
      mode: "oauth2-proxy"
      debug: true  # Enable detailed logging
```

To use it:

```bash
cd example/
quarto render . --config-file _quarto-dev.yml
```

This uses the development configuration instead of the default `_quarto.yml`.

## Cleaning Up Test Headers

To remove injected test headers from HTML files:

```bash
# Re-render the example to get clean HTML
quarto render example/

# This removes the injected headers
```

Then inject them again if needed:

```bash
node scripts/inject-test-headers.js
```

## Terminal Setup

Recommended terminal setup for smooth development:

**Terminal 1 - Watch and Build:**
```bash
npm run dev
```

**Terminal 2 - Serve Example:**
```bash
npm run serve:e2e
```

**Browser:**
Open http://127.0.0.1:5173 and keep DevTools open (F12)

**Workflow:**
1. Edit code in editor
2. Watch Terminal 1 for rebuild message
3. Press F5 in browser
4. Check Browser DevTools for errors/logs

## Testing Different Scenarios

### Scenario 1: User Logs In Successfully

```bash
node scripts/inject-test-headers.js
npm run dev & npm run serve:e2e
# Visit http://127.0.0.1:5173
# Should see "👤 test.user" in sidebar footer
```

### Scenario 2: OAuth2-Proxy Not Configured

Remove the `review.user.auth` config from YAML:

```yaml
# _quarto-dev.yml without user auth
review:
  git:
    # ... git config
  # No user.auth section
```

Render and visit - user should not be logged in.

### Scenario 3: Headers Missing

Don't inject test headers:

```bash
quarto render example/
npm run dev & npm run serve:e2e
# Visit http://127.0.0.1:5173
# Console should show warning about missing headers
```

### Scenario 4: Different User Roles

Edit test headers in `scripts/inject-test-headers.js`:

```javascript
const testHeaders = {
  'x-auth-request-user': 'admin.user',  // Change username
  'x-auth-request-email': 'admin@example.com',
};
// Then update role via console:
const userModule = window.__quarto?.userModule;
userModule?.updateUser?.({ role: 'admin' });
```

## Debugging Tips

### Issue: "window.__quarto is undefined"

**Solution:** The extension hasn't initialized yet. Wait a moment and try again:

```javascript
setTimeout(() => {
  console.log(window.__quarto);
}, 1000);
```

Or check if HTML has `[data-review]` attribute:

```javascript
document.querySelector('[data-review]')
```

### Issue: Headers not being read

**Solution:** Check DevTools Network tab for actual request headers, or inspect meta tags:

```javascript
const headers = Array.from(document.querySelectorAll('meta[name^="x-"]'));
console.log(headers);
```

### Issue: Build not updating

**Solution:** Check that:
1. Watch terminal shows "✓ [built in Xms]"
2. Files are in `src/` directory
3. No TypeScript errors shown
4. Browser is actually refreshed (not cached)

Try: Clear browser cache or use Private/Incognito mode

## Production vs Development

| | Development | Production |
|-----------|------------|------------|
| Build speed | 1-2 seconds | Slower (with optimizations) |
| Source maps | Yes (for debugging) | Optional |
| Debug logging | Enabled | Disabled |
| Test headers | Injected | From oauth2-proxy |
| Minification | No | Yes |
| Asset copy | Automatic | Manual build |

For production-like testing, run:

```bash
npm run build
```

Then serve `example/_output/` to a real HTTP server.

## Further Reading

- [OAuth2-Proxy Troubleshooting](oauth2-proxy-troubleshooting.md) - Debug OAuth2-proxy issues
- [Console Debugging Guide](console-debugging-user-auth.md) - Advanced console commands
- [OAuth2-Proxy Integration](oauth2-proxy-integration.md) - Full reference

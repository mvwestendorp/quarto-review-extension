# Debugging User Authentication via Browser Console

This guide shows how to check user authentication status and debug issues using your browser's Developer Tools console.

## Quick Start: Check if User is Logged In

1. **Open DevTools Console:**
   - Windows/Linux: `F12` or `Ctrl+Shift+I` → Console tab
   - Mac: `Cmd+Option+I` → Console tab

2. **Run this command:**
   ```javascript
   // Access the QuartoReview instance via window.__quarto
   const userModule = window.__quarto?.userModule;
   console.log('Current User:', userModule?.getCurrentUser?.());
   console.log('Is Authenticated:', userModule?.isAuthenticated?.());
   console.log('Permissions:', userModule?.getPermissions?.());
   ```

   If you see `undefined`, make sure:
   - The page has finished loading (check `DOMContentLoaded` event)
   - The `[data-review]` attribute is present in your HTML
   - The extension is properly initialized

## Finding the User Module

### Primary Way: Via window.__quarto
```javascript
// Access the QuartoReview instance and its user module
const quarto = window.__quarto?.instance;
const userModule = window.__quarto?.userModule;

console.log('QuartoReview instance:', quarto);
console.log('UserModule:', userModule);

// Access all modules from the instance
if (quarto) {
  console.log('Changes module:', quarto.changes);  // Note: private, may not be accessible
  console.log('User module:', quarto.user);
  console.log('Translation module:', quarto.getTranslation());
}
```

### Via UnifiedSidebar DOM
```javascript
// Find the sidebar element
const sidebar = document.querySelector('.review-unified-sidebar');
if (sidebar) {
  console.log('Sidebar found:', sidebar);

  // The sidebar should have user info in the build info section
  const userInfo = sidebar.querySelector('[title*="Logged in as"]');
  if (userInfo) {
    console.log('User info element found:', userInfo);
    console.log('User info text:', userInfo.textContent);
    console.log('User tooltip:', userInfo.title);
  }
}
```

### Check for 👤 Icon
```javascript
// Check all elements with 👤 icon
const userElements = Array.from(document.querySelectorAll('span')).filter(
  el => el.textContent.includes('👤')
);
console.log('User info elements found:', userElements);
userElements.forEach(el => {
  console.log('Element:', el);
  console.log('Text:', el.textContent);
  console.log('Tooltip:', el.parentElement?.title);
});
```

## Debugging OAuth2-Proxy Authentication

### 1. Check if OAuth2-Proxy is Configured
```javascript
const userModule = window.__quarto?.userModule;
console.log('OAuth2-Proxy Config:', userModule?.getOAuth2ProxyConfig?.());
console.log('Auth Mode:', userModule?.getOAuth2ProxyConfig?.()?.mode);
console.log('Debug Enabled:', userModule?.getOAuth2ProxyConfig?.()?.debug);

// If config is undefined, oauth2-proxy is not configured
if (!userModule?.getOAuth2ProxyConfig?.()) {
  console.log('ℹ️ OAuth2-Proxy is not configured - falling back to other auth methods');
}
```

### 2. Check Headers Sent in Requests
```javascript
// Open DevTools → Network tab
// Click on any request to your app
// Look for these headers in "Request Headers":
// - x-auth-request-user
// - x-auth-request-email
// - x-auth-request-preferred-username

// Or check with this command (shows available x-* headers in meta tags):
const headers = Array.from(document.querySelectorAll('meta[name^="x-"]'));
headers.forEach(meta => {
  console.log(`Header: ${meta.getAttribute('name')} = ${meta.getAttribute('content')}`);
});
```

### 3. Check Authentication Status
```javascript
const userModule = window.__quarto?.userModule;
console.log('Is Authenticated:', userModule?.isAuthenticated?.());
console.log('Current User:', userModule?.getCurrentUser?.());
console.log('User Permissions:', userModule?.getPermissions?.());
console.log('Can Edit:', userModule?.canEdit?.());
console.log('Can Comment:', userModule?.canComment?.());
console.log('Is Admin:', userModule?.isAdmin?.());
```

### 4. Manually Trigger OAuth2-Proxy Login
```javascript
// If headers are available but user wasn't logged in during initialization
const userModule = window.__quarto?.userModule;
if (userModule) {
  const success = userModule.loginFromOAuth2ProxyHeaders?.();
  console.log('OAuth2-Proxy login attempted:', success);
  console.log('Current user:', userModule.getCurrentUser?.());
}
```

### 5. Check Available Headers (Debug Mode)
```javascript
// If debug mode is enabled in YAML, you'll see detailed logs:
// "[HeaderProvider] Found header "x-auth-request-user" from meta tag: john.doe"
// "[HeaderProvider] Found header "x-auth-request-email" from window.__authHeaders"

// Check which headers are available in meta tags:
const headers = Array.from(document.querySelectorAll('meta[name^="x-"]'));
headers.forEach(meta => {
  console.log(`${meta.getAttribute('name')}: ${meta.getAttribute('content')}`);
});

// Check window.__authHeaders if set by oauth2-proxy:
console.log('window.__authHeaders:', (window as any).__authHeaders);
```

## Common Console Outputs

### User is Logged In ✅
```javascript
Current User: {
  id: "john.doe",
  name: "john.doe",
  email: "john@example.com",
  role: "editor"
}
Is Authenticated: true
User Permissions: {
  canView: true,
  canEdit: true,
  canComment: true,
  canPush: true,
  canMerge: false,
  isAdmin: false
}
```

### User is Not Logged In ❌
```javascript
Current User: null
Is Authenticated: false
User Permissions: {
  canView: false,
  canEdit: false,
  canComment: false,
  canPush: false,
  canMerge: false,
  isAdmin: false
}
```

### OAuth2-Proxy Misconfigured ⚠️
```javascript
OAuth2-Proxy Config: {
  mode: "oauth2-proxy",
  userHeader: "x-auth-request-user",
  emailHeader: "x-auth-request-email",
  usernameHeader: "x-auth-request-preferred-username",
  defaultRole: "editor",
  debug: true
}

// But then check headers:
// No x-auth-request-* headers found in meta tags
// And in console you'd see warning:
// "[Quarto Review] Warning: oauth2-proxy authentication is enabled but headers are missing..."
```

## Debug Checklist

When user info is not appearing, check in order:

1. **Is QuartoReview initialized?**
   ```javascript
   console.log('QuartoReview instance:', window.__quarto?.instance);
   console.log('UserModule:', window.__quarto?.userModule);
   ```

   If undefined, the extension may not be initialized yet. Wait for `DOMContentLoaded` or check for `[data-review]` attribute.

2. **Is there a user logged in?**
   ```javascript
   const userModule = window.__quarto?.userModule;
   console.log('Is Authenticated:', userModule?.isAuthenticated?.());
   console.log('Current User:', userModule?.getCurrentUser?.());
   ```

3. **Is the sidebar visible?**
   ```javascript
   const sidebar = document.querySelector('.review-unified-sidebar');
   console.log('Sidebar exists:', !!sidebar);
   console.log('Sidebar visible:', sidebar?.style.display !== 'none');
   ```

4. **Is the user info element being created?**
   ```javascript
   const userInfo = document.querySelector('[title*="Logged in as"]');
   console.log('User info element exists:', !!userInfo);
   if (!userInfo) {
     console.log('Build info section HTML:', document.querySelector('.review-build-info')?.innerHTML);
   }
   ```

5. **Check for console errors/warnings:**
   - Look for messages starting with `[Quarto Review]`
   - Look for messages starting with `[UserModule]`
   - Look for messages starting with `[HeaderProvider]`
   - Look for messages starting with `[OAuth2ProxyInit]`
   - Check for any JavaScript errors in the console

## Enabling Full Debug Mode

To see all debug messages, run in console:

```javascript
// Enable localStorage debug flag
localStorage.setItem('debug', '*');

// Reload the page
location.reload();

// Now you'll see detailed logs for all modules
```

Then check YAML config includes:
```yaml
review:
  user:
    auth:
      mode: 'oauth2-proxy'
      debug: true
```

## Testing Without OAuth2-Proxy

If you want to test the user display without oauth2-proxy configured:

```javascript
// Create a test user manually
const userModule = window.__quarto?.userModule;
if (userModule) {
  const testUser = {
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com',
    role: 'editor'
  };
  userModule.login?.(testUser);

  // Sidebar should now show the user info
  // May need to refresh sidebar by calling:
  // window.__quarto?.uiModule?.refresh?.();
}
```

## Still Not Working?

If user info still doesn't appear after following this guide:

1. **Verify QuartoReview is exposed globally:**
   ```javascript
   // Check if window.__quarto is available
   console.log('window.__quarto:', window.__quarto);

   // If undefined, the extension may not be initialized yet
   // Try again after a few seconds
   setTimeout(() => {
     console.log('window.__quarto after delay:', window.__quarto);
   }, 2000);
   ```

2. **Check if [data-review] attribute exists:**
   ```javascript
   const reviewElement = document.querySelector('[data-review]');
   console.log('[data-review] element:', reviewElement);
   ```

3. **Verify build info section renders:**
   ```javascript
   const buildInfo = document.querySelector('.review-build-info');
   console.log('Build info section:', buildInfo);
   console.log('HTML:', buildInfo?.innerHTML);
   ```

4. **Enable full debug logging:**
   ```javascript
   localStorage.setItem('debug', '*');
   location.reload();  // Reload to see all debug messages
   ```

5. **Check for initialization errors:**
   ```javascript
   // The extension logs startup info to console
   // Look for messages like:
   // "🎨 Quarto Review Extension 0.1.0"
   // "✓ Git review service initialized"

   // If these don't appear, check:
   // 1. Is the extension JavaScript loaded? Check Network tab in DevTools
   // 2. Are there any JavaScript errors? Check Console tab
   // 3. Is the [data-review] attribute present in your HTML?
   ```

---

**Pro Tip:** Full debug check script:

```javascript
console.group('🔍 Quarto Review Debug Info');
console.log('QuartoReview instance:', window.__quarto?.instance);
console.log('UserModule:', window.__quarto?.userModule);

const userModule = window.__quarto?.userModule;
if (userModule) {
  console.group('User Info');
  console.log('Is authenticated:', userModule.isAuthenticated?.());
  console.log('Current user:', userModule.getCurrentUser?.());
  console.log('OAuth2 config:', userModule.getOAuth2ProxyConfig?.());
  console.log('Permissions:', userModule.getPermissions?.());
  console.groupEnd();
}

const sidebar = document.querySelector('.review-unified-sidebar');
console.log('Sidebar element:', sidebar);
if (sidebar) {
  const userInfo = document.querySelector('[title*="Logged in as"]');
  console.log('User info element:', userInfo);
  console.log('Build info HTML:', document.querySelector('.review-build-info')?.innerHTML);
}

console.log('[data-review] attribute:', document.querySelector('[data-review]'));
console.groupEnd();
```

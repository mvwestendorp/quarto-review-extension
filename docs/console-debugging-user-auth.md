# Debugging User Authentication via Browser Console

This guide shows how to check user authentication status and debug issues using your browser's Developer Tools console.

## Quick Start: Check if User is Logged In

1. **Open DevTools Console:**
   - Windows/Linux: `F12` or `Ctrl+Shift+I` → Console tab
   - Mac: `Cmd+Option+I` → Console tab

2. **Run this command:**
   ```javascript
   // Access the window object to get UI module and user module
   // The UI module stores the user module internally
   console.log('Checking user authentication...');

   // Try to find the user module in window object
   const userModule = window.__quarto?.userModule || window.userModule;
   if (userModule && typeof userModule.getCurrentUser === 'function') {
     const user = userModule.getCurrentUser();
     console.log('Current User:', user);
  } else {
    console.log('User module not found in window object');
  }
   ```

## Finding the User Module

### Option 1: Via UIModule (if exposed)
```javascript
// If UIModule is exposed globally
const uiModule = window.__quarto?.uiModule || window.uiModule;
if (uiModule) {
  console.log('UIModule found:', uiModule);
}
```

### Option 2: Via UnifiedSidebar
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

### Option 3: Manual inspection
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
if (userModule) {
  const config = userModule.getOAuth2ProxyConfig?.();
  console.log('OAuth2-Proxy Config:', config);
  console.log('Auth Mode:', config?.mode);
  console.log('Debug Enabled:', config?.debug);
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
if (userModule) {
  console.log('Is Authenticated:', userModule.isAuthenticated?.());
  console.log('Current User:', userModule.getCurrentUser?.());
  console.log('User Permissions:', userModule.getPermissions?.());
  console.log('Can Edit:', userModule.canEdit?.());
  console.log('Can Comment:', userModule.canComment?.());
  console.log('Is Admin:', userModule.isAdmin?.());
}
```

### 4. Check Header Provider (Debug Mode)
```javascript
// If debug mode is enabled, check which headers were found
const userModule = window.__quarto?.userModule;
if (userModule) {
  // Check the logs - if debug is enabled you'll see messages like:
  // "[HeaderProvider] Found header "x-auth-request-user" from meta tag: john.doe"

  // To enable debug mode dynamically:
  const config = userModule.config;
  if (config && config.headerProvider) {
    config.headerProvider.setDebugMode?.(true);
    // Try login again
    userModule.loginFromOAuth2ProxyHeaders?.();
  }
}
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

1. **Is the sidebar visible?**
   ```javascript
   const sidebar = document.querySelector('.review-unified-sidebar');
   console.log('Sidebar exists:', !!sidebar);
   ```

2. **Is there a user logged in?**
   ```javascript
   const userModule = window.__quarto?.userModule;
   console.log('User logged in:', userModule?.isAuthenticated?.());
   ```

3. **Is the user info element being created?**
   ```javascript
   const userInfo = document.querySelector('[title*="Logged in as"]');
   console.log('User info element:', userInfo);
   console.log('Display style:', userInfo?.style.display);
   ```

4. **What does the build info section show?**
   ```javascript
   const buildInfo = document.querySelector('.review-build-info');
   console.log('Build info section:', buildInfo);
   console.log('Build info HTML:', buildInfo?.innerHTML);
   ```

5. **Check browser console for warnings/errors:**
   - Look for messages starting with `[Quarto Review]`
   - Look for messages starting with `[UserModule]`
   - Look for messages starting with `[HeaderProvider]`
   - Look for messages starting with `[OAuth2ProxyInit]`

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

1. **Check the fix in UIModule:**
   - Verify that `createPersistentSidebar()` calls `this.unifiedSidebar.setUserModule(this.userModule)`
   - This is in `src/modules/ui/index.ts` around line 2588

2. **Verify build info section renders:**
   ```javascript
   const buildInfo = document.querySelector('.review-build-info');
   console.log('Section exists:', !!buildInfo);
   console.log('Section HTML:', buildInfo?.innerHTML);
   ```

3. **Check UnifiedSidebar has userModule property:**
   ```javascript
   // In the sidebar instance, check if userModule is set
   // This depends on how you access the sidebar instance
   ```

4. **Enable full debug logging** and reload to see what's happening step by step

---

**Pro Tip:** You can copy-paste the entire debug check script into console at once:

```javascript
const userModule = window.__quarto?.userModule;
console.group('User Authentication Debug Info');
console.log('Module exists:', !!userModule);
if (userModule) {
  console.log('Is authenticated:', userModule.isAuthenticated?.());
  console.log('Current user:', userModule.getCurrentUser?.());
  console.log('OAuth2 config:', userModule.getOAuth2ProxyConfig?.());
  console.log('Permissions:', userModule.getPermissions?.());
}
const sidebar = document.querySelector('.review-unified-sidebar');
console.log('Sidebar exists:', !!sidebar);
const userInfo = document.querySelector('[title*="Logged in as"]');
console.log('User info element:', userInfo);
console.groupEnd();
```

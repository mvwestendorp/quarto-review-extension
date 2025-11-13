# OAuth2-Proxy Troubleshooting Guide

This guide helps you diagnose and fix oauth2-proxy authentication issues.

## Quick Diagnosis

### Enable Debug Mode

Add `?oauth2-debug` to your URL:
```
http://your-app.example.com/?oauth2-debug
```

Then open DevTools → Console. You'll see detailed header debugging information:

```
[HeaderProvider] Found header "x-auth-request-user" from meta tag: john.doe
[HeaderProvider] Header "x-auth-request-email" found from window.__authHeaders
[HeaderProvider] Available x-* headers: ['x-auth-request-user=john.doe', ...]
```

### Check Browser Console for Warnings

If oauth2-proxy is configured but failing, you'll see:

```
[Quarto Review] Warning: oauth2-proxy authentication is enabled but headers are missing.
This usually means: 1) oauth2-proxy is not running, 2) Istio AuthorizationPolicy is not applied,
3) Headers are not being forwarded to your app, or 4) You are not authenticated yet.
Check browser DevTools -> Network tab for request headers like x-auth-request-user.
```

## Troubleshooting Matrix

### ❌ Scenario 1: "User not logging in automatically"

**Symptoms:**
- No console warning
- No errors in console
- `isAuthenticated()` returns false
- No debug messages about oauth2-proxy

**Diagnosis:**
Check if oauth2-proxy auth is configured:

```typescript
const userModule = new UserModule();
console.log(userModule.getOAuth2ProxyConfig());
```

If it's `undefined`, oauth2-proxy is not configured.

**Solution:**
1. Verify you have `review.user.auth.mode: "oauth2-proxy"` in your Quarto YAML
2. Check that `initializeOAuth2ProxyAuth(userModule)` is being called
3. Enable `?oauth2-debug` to verify the configuration is loaded

---

### ❌ Scenario 2: Console warning appears - oauth2-proxy configured but headers missing

**Symptoms:**
```
[Quarto Review] Warning: oauth2-proxy authentication is enabled but headers are missing
```

**Step 1: Verify oauth2-proxy forwarding is enabled**

Check Istio AuthorizationPolicy `headersToUpstreamOnAllow`:

```bash
kubectl describe authorizationpolicy <policy-name> -n <namespace>
```

Must include:
```yaml
headersToUpstreamOnAllow:
  - x-auth-request-user
  - x-auth-request-email
  - x-auth-request-preferred-username
  - x-auth-request-access-token
```

**Step 2: Verify headers are present in requests**

Open DevTools → Network tab:
1. Reload page
2. Click on any request to your app
3. Click "Headers" tab
4. Scroll down to "Request Headers"
5. Look for `x-auth-request-user` header

**Missing headers?** → Skip to "Headers not in network requests" below

---

### ❌ Scenario 3: "Error during oauth2-proxy authentication" in console

**Symptoms:**
```
[Quarto Review] Error during oauth2-proxy authentication: [error message]
```

**Step 1: Check what the error is**

Look for the full error message in console. Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'getHeader'` | Header provider not initialized | Check `new BrowserHeaderProvider()` is created |
| `localStorage is not defined` | Running in Node.js environment | This is normal in tests |
| `document is not defined` | Not in browser context | Initialize after DOM is ready |

**Step 2: Increase logging**

Enable debug mode and check what's logged:
```bash
# In console
localStorage.setItem('debug', 'UserModule,OAuth2ProxyInit,*');
// Reload page
```

---

## Specific Problem Solutions

### ❌ Headers not in network requests

**Problem:** No `x-auth-request-*` headers in request headers tab

**Cause:** oauth2-proxy or Istio configuration issue

**Solution:**

1. **Verify oauth2-proxy is running:**
   ```bash
   kubectl get pods -n oauth2 -l app=oauth2-proxy
   kubectl logs -n oauth2 deployment/oauth2-proxy | head -20
   ```

2. **Check Istio AuthorizationPolicy is applied:**
   ```bash
   kubectl get authorizationpolicy -A | grep oauth2
   kubectl describe authorizationpolicy <name> -n <namespace>
   ```

3. **Verify oauth2-proxy is forwarding headers:**
   ```bash
   # Check oauth2-proxy config
   kubectl describe configmap oauth2-proxy-config -n oauth2
   # Should have: --set-header=X-Auth-Request-User
   #             --set-header=X-Auth-Request-Email, etc.
   ```

4. **Test oauth2-proxy directly:**
   ```bash
   # Get oauth2-proxy service endpoint
   kubectl get svc oauth2-proxy -n oauth2

   # Test authentication
   kubectl run -it --rm debug --image=curlimages/curl -- \
     curl -v http://oauth2-proxy.oauth2.svc.cluster.local:4180/ping
   ```

5. **Check Istio ExtAuthz configuration:**
   ```bash
   # View Istio configuration
   kubectl exec -it <app-pod> -- \
     curl localhost:15000/config_dump | grep -i "ext_authz\|oauth2"
   ```

---

### ❌ Headers present but custom names not working

**Symptoms:**
- Headers ARE in request (DevTools shows them)
- But your custom header names aren't being read
- App shows warning about missing headers

**Cause:** Custom header name doesn't match actual header name

**Solution:**

1. **Check actual header name in DevTools:**
   ```
   Request Headers:
   x-auth-request-user: john.doe
   x-custom-claim: value123
   ```

2. **Update config to match actual name:**
   ```yaml
   review:
     user:
       auth:
         mode: "oauth2-proxy"
         userHeader: "x-auth-request-user"  # Exact name from step 1
   ```

3. **Enable debug mode to verify:**
   ```
   URL: http://app.example.com/?oauth2-debug

   Console should show:
   [HeaderProvider] Found header "x-auth-request-user" from meta tag: john.doe
   ```

---

### ❌ Headers are URL-encoded or modified

**Symptoms:**
- Headers show as: `john%20doe` or `"john.doe"` (with quotes)
- UserModule receives empty string or invalid user ID

**Solution:**

oauth2-proxy automatically URL-encodes headers. The app should decode them.

Check if this is happening:
```typescript
// In console
const header = document.querySelector('meta[name="x-auth-request-user"]')?.content;
console.log('Raw:', header);
console.log('Decoded:', decodeURIComponent(header || ''));
```

The BrowserHeaderProvider handles this automatically, so this usually isn't an issue.

---

### ❌ User logged in locally but not from oauth2-proxy

**Symptoms:**
- `userModule.isAuthenticated()` returns true (from localStorage)
- But oauth2-proxy headers are missing
- Old user session is cached

**Solution:**

This is actually expected behavior - the old session persists. To force fresh authentication:

1. **Clear localStorage manually:**
   ```javascript
   localStorage.removeItem('quarto-review-user');
   location.reload();
   ```

2. **Logout and re-authenticate:**
   ```typescript
   userModule.logout();
   initializeOAuth2ProxyAuth(userModule);
   ```

3. **Or configure shorter session timeout:**
   ```yaml
   # In app initialization
   const userModule = new UserModule({
     sessionTimeout: 300000  // 5 minutes instead of 1 hour
   });
   ```

---

### ❌ Different header names between environments

**Symptoms:**
- Works in staging but not production
- Works with one oauth2-proxy but not another
- Headers have different names (e.g., `x-user` vs `x-auth-request-user`)

**Solution:**

Configure header names per environment:

```typescript
// app.ts
const userAuthConfig: UserAuthConfig = {
  mode: 'oauth2-proxy',
  userHeader: process.env.OAUTH2_USER_HEADER || 'x-auth-request-user',
  emailHeader: process.env.OAUTH2_EMAIL_HEADER || 'x-auth-request-email',
  usernameHeader: process.env.OAUTH2_USERNAME_HEADER || 'x-auth-request-preferred-username',
};

const userModule = new UserModule({ userAuthConfig });
```

Then set environment variables per deployment:
```bash
export OAUTH2_USER_HEADER=x-custom-user
export OAUTH2_EMAIL_HEADER=x-custom-email
```

---

### ❌ Testing without real oauth2-proxy

**Symptoms:**
- Want to develop/test locally
- Don't have oauth2-proxy set up
- Want to simulate oauth2-proxy headers

**Solution:**

Use MockHeaderProvider:

```typescript
import { MockHeaderProvider, setHeaderProvider } from '@/modules/user/HeaderProvider';

// In development/test code
if (isDevelopment) {
  const mockHeaders = new MockHeaderProvider({
    'x-auth-request-user': 'dev.user',
    'x-auth-request-email': 'dev@example.com',
    'x-auth-request-preferred-username': 'dev.user'
  });
  setHeaderProvider(mockHeaders);
}

// Now oauth2-proxy auth will work with mock headers
const userModule = new UserModule({
  userAuthConfig: { mode: 'oauth2-proxy' }
});
initializeOAuth2ProxyAuth(userModule);
```

Or use meta tags in HTML:

```html
<meta name="x-auth-request-user" content="john.doe">
<meta name="x-auth-request-email" content="john@example.com">
```

---

## Debug Checklist

### When oauth2-proxy isn't working:

- [ ] Added `?oauth2-debug` to URL and checked console output
- [ ] Verified `review.user.auth.mode: "oauth2-proxy"` in YAML config
- [ ] Confirmed `initializeOAuth2ProxyAuth(userModule)` is called on app startup
- [ ] Checked browser DevTools Network tab for `x-auth-request-*` headers
- [ ] Verified Istio AuthorizationPolicy `headersToUpstreamOnAllow` includes all needed headers
- [ ] Checked oauth2-proxy is running: `kubectl get pods -n oauth2`
- [ ] Reviewed oauth2-proxy logs for errors: `kubectl logs -n oauth2 deployment/oauth2-proxy`
- [ ] Verified header names match your oauth2-proxy configuration
- [ ] Cleared localStorage: `localStorage.removeItem('quarto-review-user')`
- [ ] Checked browser console for `[Quarto Review]` warnings or errors

### If still stuck:

1. Enable debug logging:
   ```typescript
   localStorage.setItem('debug', '*');
   ```

2. Capture full console output and check:
   - All `[UserModule]` debug messages
   - All `[OAuth2ProxyInit]` debug messages
   - All `[HeaderProvider]` debug messages

3. Collect logs from:
   ```bash
   kubectl logs -n oauth2 deployment/oauth2-proxy -f
   kubectl logs -n istio-system deployment/istiod | grep -i authz
   ```

4. Check Envoy configuration:
   ```bash
   kubectl exec -it <pod> -- curl localhost:15000/config_dump | grep -A 20 oauth2
   ```

---

## Common Configuration Mistakes

### ❌ Mistake 1: Missing headersToUpstreamOnAllow

```yaml
# WRONG - headers not forwarded
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: quarto-review-oauth2
spec:
  action: CUSTOM
  provider:
    name: "oauth2-proxy"
```

```yaml
# CORRECT - headers are forwarded
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: quarto-review-oauth2
spec:
  action: CUSTOM
  provider:
    name: "oauth2-proxy"
  rules:
  - to:
    - operation:
        methods: ["GET", "POST"]
```

Plus in EnvoyFilter:
```yaml
headersToUpstreamOnAllow:
  - x-auth-request-user
  - x-auth-request-email
```

---

### ❌ Mistake 2: Case-sensitive header names

oauth2-proxy headers are **lowercase with hyphens**:
- ✓ `x-auth-request-user`
- ✗ `X-Auth-Request-User`
- ✗ `x_auth_request_user`

---

### ❌ Mistake 3: Not configuring oauth2-proxy in app

```typescript
// WRONG - no config
const userModule = new UserModule();

// CORRECT - with config
const userModule = new UserModule({
  userAuthConfig: {
    mode: 'oauth2-proxy',
    defaultRole: 'editor'
  }
});
```

---

## Getting Help

**If you've checked everything and still stuck:**

1. Collect debugging info:
   ```bash
   # URL with debug mode
   echo "Debug URL: http://your-app/?oauth2-debug"

   # Full console output
   # (Right-click console → Save as)

   # Istio config
   kubectl describe authorizationpolicy -A

   # oauth2-proxy logs
   kubectl logs -n oauth2 deployment/oauth2-proxy --all-containers=true
   ```

2. Check these files:
   - `docs/oauth2-proxy-quickstart.md` - Basic setup
   - `docs/oauth2-proxy-integration.md` - Full reference
   - `docs/istio-oauth2-proxy-setup.md` - Istio configuration
   - `tests/unit/oauth2-proxy-auth.test.ts` - 23 test examples

3. Review the example configurations in documentation for your use case

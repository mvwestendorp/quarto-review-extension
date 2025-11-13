# Istio OAuth2-Proxy with Nginx Header Injection

This guide explains how to set up OAuth2-proxy authentication with Istio and inject authenticated user headers into your Quarto Review Extension webpage via nginx.

## Architecture

```
Internet Request
    ↓
Istio Ingress Gateway
    ↓
Istio AuthorizationPolicy (oauth2-proxy extension provider)
    ↓
oauth2-proxy (validates auth)
    ↓
Nginx (injects headers into HTML)
    ↓
Browser (JavaScript reads headers from window.__authHeaders)
```

## Problem

When using Istio's `oauth2-proxy` extension provider with `headersToUpstreamOnAllow`, the authenticated user headers are forwarded to your backend service, but the **browser never receives them**. This means JavaScript cannot access authenticated user information.

## Solution

Configure nginx to:
1. Receive the auth headers from Istio (forwarded via the oauth2-proxy extension)
2. Inject these headers into the HTML response via meta tags and a `window.__authHeaders` object
3. Browser JavaScript can then read `window.__authHeaders` to know who is authenticated

## Files

- **nginx.conf** - Nginx configuration with header injection
- **Dockerfile.nginx** - Updated Dockerfile that uses the nginx config

## Setup Instructions

### 1. Copy nginx configuration

```bash
# Copy the nginx.conf to your project root
cp nginx.conf ./nginx.conf
```

### 2. Update your Dockerfile

```dockerfile
# Build stage (your existing build)
FROM node:18 AS build
WORKDIR /build
COPY . .
RUN npm install && npm run build

# Production stage with nginx
FROM nginx:stable
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /site/_output /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Verify Istio AuthorizationPolicy

Your Istio configuration should include `headersToUpstreamOnAllow` with the OAuth2-proxy headers:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: review-oauth2
  namespace: default
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/oauth2/sa/oauth2-proxy"]
    to:
    - operation:
        methods: ["GET", "POST"]
  provider:
    name: "oauth2-proxy"
extensionProviders:
- name: "oauth2-proxy"
  envoyExtAuthzHttp:
    service: "oauth2-proxy.oauth2.svc.cluster.local"
    port: "4180"
    headersToUpstreamOnAllow:
      - authorization
      - cookie
      - x-auth-request-user
      - x-auth-request-email
      - x-auth-request-preferred-username
      - x-forwarded-access-token
    headersToDownstreamOnDeny:
      - content-type
      - set-cookie
    includeRequestHeadersInCheck:
      - cookie
      - x-forwarded-access-token
      - authorization
```

### 4. Build and Deploy

```bash
# Build Docker image
docker build -f Dockerfile.nginx -t review-app:latest .

# Push to your registry
docker push your-registry/review-app:latest

# Deploy to Kubernetes
kubectl apply -f your-deployment.yaml
```

## How It Works

### Request Flow

1. **Browser requests HTML**
   ```
   GET /debug-example.html
   ```

2. **Istio AuthorizationPolicy intercepts**
   - Checks oauth2-proxy service
   - If authenticated, forwards headers:
     - `X-Auth-Request-User: alice`
     - `X-Auth-Request-Email: alice@example.com`
     - `X-Auth-Request-Preferred-Username: alice`

3. **Nginx receives request with headers**
   - Nginx can now access these via `$http_x_auth_request_user` variables
   - Nginx config injects into HTML response

4. **Nginx injects into HTML**
   - Adds meta tags: `<meta name="x-auth-request-user" content="alice" />`
   - Adds JavaScript object: `window.__authHeaders = { "x-auth-request-user": "alice", ... }`

5. **Browser receives HTML with injected headers**
   - Browser JavaScript can read `window.__authHeaders`
   - Quarto Review Extension detects authenticated user

### Nginx Configuration Details

The nginx.conf file:

1. **Injects meta tags** for static reading:
   ```html
   <meta name="x-auth-request-user" content="$http_x_auth_request_user" />
   ```

2. **Injects JavaScript object** for dynamic access:
   ```javascript
   window.__authHeaders = {
     "x-auth-request-user": "$http_x_auth_request_user",
     "x-auth-request-email": "$http_x_auth_request_email",
     "x-auth-request-preferred-username": "$http_x_auth_request_preferred_username"
   };
   ```

3. **Disables HTML caching** so auth state is fresh:
   ```
   Cache-Control: no-store, no-cache, must-revalidate, max-age=0
   ```

4. **Caches assets aggressively** for performance:
   ```
   .js, .css, images: Cache-Control: public, immutable (1 year)
   ```

## Debugging

### Check if headers are reaching nginx

Uncomment these lines in nginx.conf to see headers in response:

```nginx
# add_header Debug-User $http_x_auth_request_user always;
# add_header Debug-Email $http_x_auth_request_email always;
# add_header Debug-Username $http_x_auth_request_preferred_username always;
```

Then check browser DevTools → Network → Response Headers:

```
Debug-User: alice
Debug-Email: alice@example.com
Debug-Username: alice
```

If these are empty, the problem is in Istio configuration, not nginx.

### Check if headers are in HTML

Open page source (Ctrl+U / Cmd+U) and search for `__authHeaders`:

```html
<script>
  window.__authHeaders = {
    "x-auth-request-user": "alice",
    "x-auth-request-email": "alice@example.com",
    "x-auth-request-preferred-username": "alice"
  };
</script>
```

If these are empty strings, nginx is not receiving headers from Istio.

### Check browser console

Look for messages:
```
[nginx] OAuth2-proxy headers injected: {...}
```

The Quarto Review Extension logs should show:
```
[UserModule] ✓ AUTHENTICATION SUCCESSFUL
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `window.__authHeaders` is empty | Headers not reaching nginx | Check Istio `headersToUpstreamOnAllow` config |
| Headers show in Debug-* but not in HTML | nginx config not applied | Rebuild Docker image and restart pod |
| 404 on favicon | Normal | Nginx is configured to return 204 (no content) |
| "oauth2-proxy configured but headers missing" warning | User not authenticated to oauth2-proxy | Ensure oauth2-proxy pod is running and user logged in |

## Security Notes

- **Headers are injected into HTML:** Anyone with access to view-source can see other users' info
- **Use HTTPS:** Always use HTTPS in production (Istio should enforce this via `PERMISSIVE` → `STRICT` mode)
- **Trust Istio AuthorizationPolicy:** Headers are only present if oauth2-proxy has authenticated the user
- **Content Security Policy:** nginx.conf includes CSP header - adjust if needed for your use case

## Next Steps

1. Update your Dockerfile to use the new nginx configuration
2. Rebuild and deploy
3. Check browser DevTools for `window.__authHeaders` object
4. Quarto Review Extension should now show authenticated user in sidebar

## References

- [Istio Security - Authorization Policies](https://istio.io/latest/docs/tasks/security/authorization/authz-custom/)
- [OAuth2-Proxy Documentation](https://oauth2-proxy.github.io/)
- [Nginx Sub Module Documentation](https://nginx.org/en/docs/http/ngx_http_sub_module.html)

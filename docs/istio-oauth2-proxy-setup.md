# Istio OAuth2-Proxy Setup Guide

This guide shows you how to configure Istio to work with oauth2-proxy for the Quarto Review Extension.

## Istio Configuration

Add the oauth2-proxy extension provider to your Istio config:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: quarto-review-oauth2
  namespace: default  # Change to your namespace
spec:
  selector:
    matchLabels:
      app: quarto-review  # Change to your app label
  action: CUSTOM
  provider:
    name: "oauth2-proxy"
  rules:
  - to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
---
apiVersion: v1
kind: Namespace
metadata:
  name: oauth2
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oauth2-proxy-access
  namespace: oauth2
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/istio-system/sa/istiod"]
    to:
    - operation:
        methods: ["*"]
```

## AuthorizationPolicy Configuration

Minimal configuration (recommended for most cases):

```yaml
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
        methods: ["GET", "POST", "PUT", "DELETE"]
```

With additional header checks:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: quarto-review-oauth2-advanced
spec:
  action: CUSTOM
  provider:
    name: "oauth2-proxy"
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/oauth2/sa/oauth2-proxy"
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
  - from:
    - source:
        requestPrincipals: ["*"]  # Authenticated users
    when:
    - key: request.headers[x-auth-request-user]
      values: ["*"]  # Any authenticated user
```

## EnvoyFilter for Header Forwarding

Configure which headers are forwarded from oauth2-proxy:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: oauth2-proxy-headers
  namespace: default  # Your app namespace
spec:
  workloadSelector:
    labels:
      app: quarto-review  # Your app label
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.ext_authz
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz
          transport_api_version: V3
          with_request_body:
            max_request_bytes: 8192
            allow_partial_message: false
          check_settings:
            context_extensions:
              x-request-id: request.headers["x-request-id"]
          failure_mode_allow: false
          status_on_error: 403
          grpc_service:
            envoy_grpc:
              cluster_name: ext-authz
            timeout: 10s
          metadata_context_namespaces:
            - envoy.filters.http.authz
```

## ServiceEntry for OAuth2-Proxy

If oauth2-proxy is outside the mesh:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: oauth2-proxy
spec:
  hosts:
  - oauth2-proxy.example.com  # Your oauth2-proxy host
  ports:
  - number: 4180
    name: http
    protocol: HTTP
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: oauth2-proxy
spec:
  host: oauth2-proxy.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

## Telemetry Configuration

Monitor oauth2-proxy authentication events:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: oauth2-metrics
spec:
  metrics:
  - providers:
    - name: prometheus
      state: ENABLED
    dimensions:
    - response.code
    - request.path
    - request.auth.principal
    - request.headers["x-auth-request-user"]
    - request.headers["x-auth-request-email"]
```

## VirtualService Configuration

Route authenticated requests to your app:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: quarto-review
spec:
  hosts:
  - quarto-review.example.com  # Your domain
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: quarto-review
        port:
          number: 3000  # Your app port
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
```

## Testing Your Setup

### 1. Verify Headers Are Forwarded

```bash
# Port-forward to your app
kubectl port-forward -n default svc/quarto-review 3000:3000

# In another terminal, test with curl
curl -i http://localhost:3000/
# Check request headers in your app logs
```

### 2. Check oauth2-proxy Logs

```bash
kubectl logs -n oauth2 -l app=oauth2-proxy -f
```

### 3. Verify Headers in Browser

Open DevTools → Network tab, reload the page, and check request headers:

- `x-auth-request-user` ✓
- `x-auth-request-email` ✓
- `x-auth-request-preferred-username` ✓
- `x-auth-request-access-token` ✓
- `authorization` ✓
- `cookie` ✓

### 4. Debug Authorization Policy

```bash
# Check if policy is applied
kubectl get authorizationpolicy -A

# Describe the policy
kubectl describe authorizationpolicy quarto-review-oauth2 -n default

# View Envoy configuration
kubectl exec -it deployment/quarto-review -- \
  curl localhost:15000/config_dump | grep -i oauth2
```

## Troubleshooting

### Headers Not Forwarded

1. **Check oauth2-proxy configuration:**
   ```yaml
   # Ensure oauth2-proxy config has header forwarding enabled
   providers:
     oidc:
       client_id: your-client-id
       client_secret: your-client-secret
       # Check provider forwards headers
   ```

2. **Verify ExtAuthz is configured:**
   ```bash
   kubectl exec -it pod/quarto-review -- \
     curl localhost:15000/config_dump | grep -A 20 ext_authz
   ```

3. **Check Istio version support:**
   - oauth2-proxy external authz requires Istio 1.6+
   - Latest recommended: Istio 1.15+

### 403 Forbidden Errors

1. **Check AuthorizationPolicy matches your requests:**
   ```bash
   kubectl logs -n default deployment/quarto-review | grep 403
   ```

2. **Verify oauth2-proxy is reachable:**
   ```bash
   kubectl run -it --rm debug --image=curlimages/curl -- \
     curl http://oauth2-proxy.oauth2.svc.cluster.local:4180/ping
   ```

3. **Check failure_mode_allow is set appropriately:**
   - `true`: Allow requests if oauth2-proxy is down
   - `false`: Deny requests if oauth2-proxy is down (secure)

### User Not Authenticating

1. **Verify oauth2-proxy redirects to OIDC provider:**
   ```bash
   curl -i http://your-app.example.com
   # Should redirect to oauth2-proxy login
   ```

2. **Check OIDC provider configuration:**
   ```bash
   kubectl logs -n oauth2 deployment/oauth2-proxy | grep "provider\|callback"
   ```

3. **Verify callback URL:**
   - OIDC callback should be: `https://your-domain.com/oauth2/callback`
   - Must match OIDC provider configuration

## Performance Tuning

### Increase Timeout for oauth2-proxy

```yaml
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

Add to EnvoyFilter:
```yaml
timeout: 15s  # Increase from default 10s
```

### Connection Pooling

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: quarto-review
spec:
  host: quarto-review
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
```

## Security Best Practices

1. **Use TLS for oauth2-proxy communication:**
   ```yaml
   # External oauth2-proxy requires TLS
   apiVersion: networking.istio.io/v1beta1
   kind: DestinationRule
   metadata:
     name: oauth2-proxy
   spec:
     host: oauth2-proxy.example.com
     trafficPolicy:
       portLevelSettings:
       - port:
           number: 4180
         tls:
           mode: SIMPLE
   ```

2. **Restrict oauth2-proxy access:**
   ```yaml
   apiVersion: security.istio.io/v1beta1
   kind: NetworkPolicy
   metadata:
     name: oauth2-proxy-access
   spec:
     podSelector:
       matchLabels:
         app: oauth2-proxy
     policyTypes:
     - Ingress
     - Egress
   ```

3. **Enable mTLS between services:**
   ```yaml
   apiVersion: security.istio.io/v1beta1
   kind: PeerAuthentication
   metadata:
     name: default
   spec:
     mtls:
       mode: STRICT
   ```

## Reference

- [Istio ExtAuthz Documentation](https://istio.io/latest/docs/tasks/security/authorization/authz-custom/)
- [oauth2-proxy Project](https://github.com/oauth2-proxy/oauth2-proxy)
- [oauth2-proxy Configuration](https://oauth2-proxy.github.io/oauth2-proxy/)
- [Quarto Review OAuth2-Proxy Integration](./oauth2-proxy-integration.md)

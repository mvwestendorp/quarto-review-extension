# OAuth2-Proxy Quick Start

Get up and running with oauth2-proxy authentication in 5 minutes.

## 1. Configure Your Document

Add this to your Quarto document's YAML metadata:

```yaml
---
review:
  user:
    auth:
      mode: "oauth2-proxy"           # Enable oauth2-proxy authentication
      defaultRole: "editor"           # Users get 'editor' role by default
  git:
    provider: "github"
    owner: "my-org"
    repo: "my-repo"
    auth:
      mode: "pat"                    # Users provide GitHub PAT separately
---
```

## 2. Initialize on App Load

In your main application file:

```typescript
import { UserModule } from '@/modules/user';
import { initializeOAuth2ProxyAuth } from '@/modules/user/oauth2-proxy-init';

// Create user module with oauth2-proxy config
const userModule = new UserModule({
  userAuthConfig: {
    mode: 'oauth2-proxy',
    defaultRole: 'editor'
  }
});

// Auto-login from oauth2-proxy headers
initializeOAuth2ProxyAuth(userModule);

// Now user is authenticated if headers exist
if (userModule.isAuthenticated()) {
  console.log(`Welcome, ${userModule.getCurrentUser()?.name}!`);
}
```

## 3. Verify Istio Configuration

Ensure your Istio oauth2-proxy forwards these headers:

```yaml
extensionProviders:
  - name: "oauth2-proxy"
    envoyExtAuthzHttp:
      headersToUpstreamOnAllow:
        - authorization
        - cookie
        - x-auth-request-user
        - x-auth-request-email
        - x-auth-request-preferred-username
        - x-auth-request-access-token
        - x-forwarded-access-token
```

## Common Scenarios

### Scenario A: OAuth2-Proxy User + GitHub PAT

User is authenticated via oauth2-proxy, but needs to provide GitHub PAT for submitting reviews:

```yaml
review:
  user:
    auth:
      mode: "oauth2-proxy"
  git:
    provider: "github"
    auth:
      mode: "pat"  # User enters PAT when submitting
```

**Flow:**
1. User hits your site → oauth2-proxy authenticates them
2. App auto-logs them in via oauth2-proxy headers
3. User edits document
4. At submission: app prompts for GitHub PAT
5. Review is submitted with their GitHub credentials

### Scenario B: OAuth2-Proxy for Everything

Use oauth2-proxy token for both user authentication and Git operations (e.g., when it's the same organization):

```yaml
review:
  user:
    auth:
      mode: "oauth2-proxy"
  git:
    provider: "github"
    auth:
      mode: "header"
      headerName: "x-auth-request-access-token"  # Use oauth2-proxy token
```

**Flow:**
1. User hits your site → oauth2-proxy authenticates them
2. App auto-logs them in AND uses their token for GitHub
3. User edits and submits review automatically with their GitHub account

### Scenario C: Restrict to View-Only

Use oauth2-proxy to authenticate but restrict users to view-only mode:

```yaml
review:
  user:
    auth:
      mode: "oauth2-proxy"
      defaultRole: "viewer"  # Read-only access
```

**Flow:**
1. User is authenticated via oauth2-proxy
2. But UI disables editing and submission
3. Perfect for document reviewers who shouldn't edit

## Troubleshooting

**User not logging in automatically?**

1. Check browser DevTools → Application → Cookies/Storage
2. Check Request headers for `x-auth-request-user` header
3. Verify UserModule is being initialized with correct config
4. Check browser console for `[UserModule]` logs

**Headers not appearing?**

1. Verify oauth2-proxy is configured correctly in Istio
2. Check that `headersToUpstreamOnAllow` includes needed headers
3. Test manually: `curl -H "Cookie: <oauth2-proxy-cookie>" http://your-app`

**Want to test locally without oauth2-proxy?**

Use MockHeaderProvider for development:

```typescript
import { MockHeaderProvider, setHeaderProvider } from '@/modules/user/HeaderProvider';

const mockHeaders = new MockHeaderProvider({
  'x-auth-request-user': 'dev.user',
  'x-auth-request-email': 'dev@example.com'
});
setHeaderProvider(mockHeaders);

// Now app will use mock headers instead of real ones
initializeOAuth2ProxyAuth(userModule);
```

## What Gets Configured?

After successful oauth2-proxy login, the user object contains:

```typescript
{
  id: 'john.doe',              // From x-auth-request-user
  name: 'john.doe',            // Same as id
  email: 'john@example.com',   // From x-auth-request-email
  role: 'editor'               // From defaultRole config
}
```

## Role Permissions

| Permission | Viewer | Editor | Admin |
|-----------|--------|--------|-------|
| View document | ✓ | ✓ | ✓ |
| Edit document | ✗ | ✓ | ✓ |
| Add comments | ✓ | ✓ | ✓ |
| Submit review | ✗ | ✓ | ✓ |
| Merge PR | ✗ | ✗ | ✓ |

## Next Steps

- Read full [OAuth2-Proxy Integration Guide](./oauth2-proxy-integration.md)
- Configure [custom header names](./oauth2-proxy-integration.md#scenario-4-custom-header-names)
- Set up [server-side header injection](./oauth2-proxy-integration.md#providing-headers-via-meta-tags)
- Review [permission matrix](./oauth2-proxy-integration.md#permission-matrix)

# OAuth2-Proxy Integration Guide

This guide explains how to configure the Quarto Review Extension to work with Istio's oauth2-proxy for user authentication while maintaining flexibility for Git provider authentication.

## Overview

The oauth2-proxy integration separates **user authentication** from **Git provider authentication**:

- **User Authentication**: Uses oauth2-proxy headers to identify application users
- **Git Authentication**: Uses independent credentials (PAT, cookie, header) for repository access

This separation allows you to authenticate users against one identity provider (e.g., corporate OAuth2 via oauth2-proxy) while using different credentials for Git repositories (GitHub, GitLab, etc.).

## Architecture

```
┌─────────────────┐
│   Istio/oauth2  │  Authenticates user via OAuth2
│      proxy      │  Forwards headers: x-auth-request-user, etc.
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Quarto Review Extension        │
│                                 │
│  ┌──────────────────────────┐  │
│  │   UserModule             │  │
│  │ (reads oauth2-proxy      │  │
│  │  headers for user auth)  │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │  Git Provider            │  │
│  │ (uses separate auth:     │  │
│  │  PAT, cookie, or header) │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
         │
         ├──────────────────────────┐
         ▼                          ▼
    ┌────────────┐          ┌────────────┐
    │   GitHub   │          │   GitLab   │
    │  (GitHub   │          │  (GitLab   │
    │   PAT)     │          │  cookie)   │
    └────────────┘          └────────────┘
```

## Configuration

### Istio Configuration

Your Istio oauth2-proxy setup should forward these headers:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: quarto-review-authz
spec:
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/oauth2/sa/oauth2-proxy"]
    to:
    - operation:
        methods: ["GET", "POST", "PUT", "DELETE"]
```

Ensure oauth2-proxy forwards these key headers:

```yaml
headersToUpstreamOnAllow:
  - authorization            # For Git provider auth
  - cookie                    # For Git provider auth
  - x-auth-request-user       # User identifier
  - x-auth-request-email      # User email
  - x-auth-request-preferred-username  # Fallback username
  - x-auth-request-access-token        # Optional: oauth2 access token
  - x-forwarded-access-token           # Alternative token header
```

### Quarto Document Configuration

#### Scenario 1: OAuth2-Proxy User Auth + GitHub PAT

User authentication via oauth2-proxy, Git uses GitHub Personal Access Token:

```yaml
---
title: "My Document"
review:
  user:
    auth:
      mode: "oauth2-proxy"           # Read user from oauth2-proxy headers
      defaultRole: "editor"           # Default role for authenticated users
  git:
    provider: "github"
    owner: "my-org"
    repo: "my-repo"
    baseBranch: "main"
    auth:
      mode: "pat"                     # User provides GitHub PAT at submission time
---
```

#### Scenario 2: OAuth2-Proxy User Auth + OAuth2-Proxy Git Token

Both user and Git auth use oauth2-proxy headers:

```yaml
---
title: "My Document"
review:
  user:
    auth:
      mode: "oauth2-proxy"
      defaultRole: "editor"
  git:
    provider: "github"
    owner: "internal-org"
    repo: "internal-repo"
    baseBranch: "main"
    auth:
      mode: "header"
      headerName: "x-auth-request-access-token"  # Use oauth2-proxy token for GitHub
---
```

#### Scenario 3: OAuth2-Proxy User Auth + GitLab Cookie Session

User authenticated via oauth2-proxy, Git uses separate GitLab session:

```yaml
---
title: "My Document"
review:
  user:
    auth:
      mode: "oauth2-proxy"
      defaultRole: "editor"
  git:
    provider: "gitlab"
    url: "https://gitlab.example.com/api/v4"
    owner: "my-group"
    repo: "my-project"
    auth:
      mode: "cookie"
      cookieName: "gitlab_session"  # GitLab session cookie
---
```

#### Scenario 4: Custom Header Names

If your oauth2-proxy is configured with non-standard header names:

```yaml
---
title: "My Document"
review:
  user:
    auth:
      mode: "oauth2-proxy"
      userHeader: "x-oauth-user"           # Custom user header
      emailHeader: "x-oauth-email"         # Custom email header
      usernameHeader: "x-oauth-username"   # Custom username fallback
      defaultRole: "viewer"                # Restrict to viewers
  git:
    provider: "gitlab"
    owner: "my-group"
    repo: "my-project"
    auth:
      mode: "header"
---
```

## User Role Assignment

The `defaultRole` option in user auth config determines what permissions authenticated users have:

- **`viewer`**: Read-only access, no editing or pushing
- **`editor`**: Can edit document and submit reviews (default)
- **`admin`**: Full access including merge permissions

Example with viewer role:

```yaml
review:
  user:
    auth:
      mode: "oauth2-proxy"
      defaultRole: "viewer"  # Users can only view, not edit
```

## Implementation Guide

### In Your Application

#### 1. Basic Setup (Automatic with Defaults)

If using standard oauth2-proxy headers, setup is minimal:

```typescript
import { UserModule } from '@/modules/user';
import { initializeOAuth2ProxyAuth } from '@/modules/user/oauth2-proxy-init';

// Create user module
const userModule = new UserModule({
  userAuthConfig: {
    mode: 'oauth2-proxy',
    defaultRole: 'editor'
  }
});

// Auto-login from headers (safe to call even if not configured)
initializeOAuth2ProxyAuth(userModule);

// Now userModule.isAuthenticated() will be true if oauth2-proxy headers exist
```

#### 2. With Custom Headers

If oauth2-proxy uses custom header names:

```typescript
const userModule = new UserModule({
  userAuthConfig: {
    mode: 'oauth2-proxy',
    userHeader: 'x-custom-user',
    emailHeader: 'x-custom-email',
    usernameHeader: 'x-custom-username',
    defaultRole: 'editor'
  }
});

initializeOAuth2ProxyAuth(userModule);
```

#### 3. Async Initialization (DOM Ready)

If you need to wait for the DOM to be ready before reading meta tags:

```typescript
import { initializeOAuth2ProxyAuthAsync } from '@/modules/user/oauth2-proxy-init';

// Wait 100ms for DOM to be ready, then attempt login
await initializeOAuth2ProxyAuthAsync(userModule);
```

#### 4. Providing Headers via Meta Tags

If your server renders the page, inject oauth2-proxy headers as meta tags:

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Inject from oauth2-proxy headers server-side -->
  <meta name="x-auth-request-user" content="john.doe">
  <meta name="x-auth-request-email" content="john@example.com">
  <meta name="x-auth-request-preferred-username" content="jdoe">
</head>
<body>
  <!-- App bootstrap here -->
</body>
</html>
```

#### 5. Providing Headers via Window Variable

Alternatively, inject into a window variable:

```html
<script>
  window.__authHeaders = {
    'x-auth-request-user': 'john.doe',
    'x-auth-request-email': 'john@example.com',
    'x-auth-request-preferred-username': 'jdoe'
  };
</script>
```

## User Model

After successful oauth2-proxy authentication, the user object looks like:

```typescript
{
  id: 'john.doe',                    // From x-auth-request-user header
  name: 'john.doe',                  // Same as id (or could be enhanced with x-auth-request-name)
  email: 'john@example.com',         // From x-auth-request-email header
  role: 'editor'                     // From defaultRole config
}
```

## Permission Matrix

After authentication with oauth2-proxy, user permissions depend on assigned role:

| Permission | Viewer | Editor | Admin |
|-----------|--------|--------|-------|
| canView() | ✓ | ✓ | ✓ |
| canEdit() | ✗ | ✓ | ✓ |
| canComment() | ✓ | ✓ | ✓ |
| canPush() | ✗ | ✓ | ✓ |
| canMerge() | ✗ | ✗ | ✓ |
| isAdmin() | ✗ | ✗ | ✓ |

## Git Provider Authentication Independence

The Git provider authentication is **completely independent** from user authentication:

```yaml
review:
  user:
    auth:
      mode: "oauth2-proxy"           # User auth: oauth2-proxy
  git:
    provider: "github"
    auth:
      mode: "pat"                    # Git auth: Personal Access Token
```

This means:
- User must be authenticated via oauth2-proxy to access the application
- Git operations use a separate GitHub PAT (user provides at submission time, or configured separately)
- No assumption that oauth2-proxy token has GitHub API access

## Session Management

User sessions authenticated via oauth2-proxy:
- Are persisted in `localStorage` under key `quarto-review-user`
- Automatically timeout after 1 hour (configurable)
- Are cleared when user explicitly logs out
- Auto-refresh when user interacts with the application

## Troubleshooting

### User Not Authenticating

1. **Check if oauth2-proxy headers are present**:
   - Open browser DevTools → Network tab
   - Check request headers from oauth2-proxy
   - Look for `x-auth-request-user`, `x-auth-request-email`

2. **Verify header names match config**:
   ```typescript
   // Debug: log received headers
   const provider = getHeaderProvider();
   console.log('x-auth-request-user:', provider.getHeader('x-auth-request-user'));
   console.log('x-auth-request-email:', provider.getHeader('x-auth-request-email'));
   ```

3. **Check browser console for logs**:
   - Look for `[UserModule]` log messages
   - Check if `loginFromOAuth2ProxyHeaders()` is being called

### Custom Header Names Not Working

1. **Verify header names are lowercase with hyphens**:
   - OAuth2-proxy converts all headers to lowercase
   - Use hyphens, not underscores: `x-auth-request-user` ✓, not `x_auth_request_user` ✗

2. **Test with MockHeaderProvider**:
   ```typescript
   import { MockHeaderProvider, setHeaderProvider } from '@/modules/user/HeaderProvider';

   const mock = new MockHeaderProvider({
     'x-custom-header': 'test-value'
   });
   setHeaderProvider(mock);
   ```

### Git Still Requires Credentials

This is expected! User authentication and Git authentication are separate:

```yaml
review:
  user:
    auth:
      mode: "oauth2-proxy"  # User authenticated automatically
  git:
    auth:
      mode: "pat"           # Git still needs PAT from user
```

User will be logged in but will be prompted for GitHub PAT when submitting review.

## API Reference

### UserModule Methods

```typescript
// Check if user is authenticated from oauth2-proxy
loginFromOAuth2ProxyHeaders(): boolean

// Get current authenticated user
getCurrentUser(): User | null

// Manual login (programmatic)
login(user: User): void

// Logout
logout(): void

// Check permissions
canView(): boolean
canEdit(): boolean
canComment(): boolean
isAdmin(): boolean
```

### Initialization Functions

```typescript
// Synchronous initialization from oauth2-proxy headers
initializeOAuth2ProxyAuth(userModule: UserModule): boolean

// Async initialization (waits for DOM)
initializeOAuth2ProxyAuthAsync(
  userModule: UserModule,
  delayMs?: number
): Promise<boolean>
```

### Header Provider API

```typescript
// Get global header provider
getHeaderProvider(): IHeaderProvider

// Set custom provider (for testing)
setHeaderProvider(provider: IHeaderProvider): void

// Reset to default
resetHeaderProvider(): void

// Mock provider for tests
new MockHeaderProvider({
  'header-name': 'value'
})
```

## Migration from Manual Auth

If you were previously using manual user login:

**Before:**
```typescript
// Manual login
userModule.login({
  id: 'john',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'editor'
});
```

**After:**
```typescript
// Automatic oauth2-proxy login
const userModule = new UserModule({
  userAuthConfig: { mode: 'oauth2-proxy' }
});
initializeOAuth2ProxyAuth(userModule);
```

## Security Considerations

1. **Headers are forwarded by oauth2-proxy**: Trust that headers come from authenticated oauth2-proxy service
2. **Client-side authentication**: User is authenticated in browser based on headers (no server validation)
3. **Git credentials remain separate**: Don't assume oauth2-proxy token is valid for Git provider
4. **Session storage**: User session stored in localStorage (not encrypted, client-side only)
5. **No role elevation**: Roles are set from config, user cannot change their own role

## See Also

- [Istio OAuth2-Proxy Documentation](https://www.istio.io/latest/docs/tasks/security/authorization/authz-custom/)
- [OAuth2-Proxy Project](https://github.com/oauth2-proxy/oauth2-proxy)
- [Quarto Review Configuration](../README.md)

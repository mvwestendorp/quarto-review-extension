# Security Documentation

Security audits, vulnerability assessments, and security best practices for the Quarto Review Extension.

## Contents

- [Security Audit Report](./SECURITY_AUDIT_REPORT.md) - Comprehensive security audit findings
- [Audit Report](./AUDIT_REPORT.md) - Security findings and remediation recommendations

## Security Policy

For information about reporting vulnerabilities, see [SECURITY.md](../../../SECURITY.md) in the project root.

## Security Considerations

The Quarto Review Extension operates entirely client-side in the browser. Key security considerations:

- **No server-side storage** - All data stays in the browser
- **No authentication system** - User management is optional
- **localStorage usage** - Changes stored locally until git push
- **No encryption** - Data stored unencrypted in browser storage

See [SECURITY.md](../../../SECURITY.md) for safe usage guidelines.

## Security Auditing

Security audits are performed regularly and documented in this directory. Each audit includes:
- Threat modeling
- Vulnerability assessment
- Dependency scanning (npm audit)
- Code review for common vulnerabilities (XSS, injection, etc.)

## Related Documentation

- [SECURITY.md](../../../SECURITY.md) - Security policy and reporting
- [Contributing](../CONTRIBUTING.md) - Security considerations for contributors

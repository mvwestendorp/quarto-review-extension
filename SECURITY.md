# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Considerations

### Data Storage

The Web Review extension stores data in the browser's localStorage:
- Comment text and metadata
- User identification information
- Document changes and annotations

**Security Note**: This data persists in the browser and is accessible to JavaScript running on the same origin. Do not use this extension for highly sensitive documents without additional security measures.

### Content Sanitization

The extension uses `innerHTML` for rendering Markdown and HTML content. All content is generated from:
1. User-provided comments (stored in localStorage)
2. Original Quarto document content
3. User edits to document content

**Mitigation**: The extension operates only on locally rendered HTML documents. There is no server-side component or external data sources.

### Known Limitations

1. **Client-side only**: All data is stored in browser localStorage
2. **No encryption**: Comments and changes are stored in plain text
3. **No authentication**: User identification is self-declared (username field)
4. **Single-origin**: Data is not shared across different domains

### Safe Usage Guidelines

1. **Do not use for sensitive documents** that require confidentiality
2. **Export review data regularly** to avoid data loss
3. **Clear browser data** when done reviewing on shared computers
4. **Use HTTPS** when sharing documents to prevent man-in-the-middle attacks

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by:

1. **DO NOT** open a public GitHub issue
2. Email the maintainer with details
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and work with you to address the issue.

## Security Testing

The project includes automated security scanning via GitHub Actions:
- **Trivy**: Scans for known vulnerabilities
- **Gitleaks**: Checks for exposed secrets
- **ESLint Security**: Checks JavaScript for security anti-patterns

## Changelog

### Version 1.0.0
- Initial release
- Client-side only operation
- localStorage-based data persistence
- No server-side components

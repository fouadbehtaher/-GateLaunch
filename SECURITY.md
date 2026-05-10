# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: security@gatelaunch.com

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to Include

Please include as much of the following information as possible:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

- Acknowledgment of your report within 48 hours
- Regular updates on the progress of fixing the vulnerability
- Credit for the discovery (unless you prefer to remain anonymous)

## Security Best Practices

### For Developers

1. **Never commit sensitive data**
   - API keys, passwords, tokens
   - Use `.env` files (never committed)

2. **Keep dependencies updated**
   ```bash
   npm audit
   npm audit fix
   ```

### OWASP-oriented Security Checks (Recommended)

Run the bundled checks locally:
```bash
npm run security
```

What it does:
- `npm run check` (syntax checks)
- `npm run security:owasp` (production readiness checks: demo users, bootstrap admin, dist build, proxy settings)
- `npm run security:audit` (dependency vulnerabilities via `npm audit`)

3. **Use environment variables**
   ```javascript
   const secret = process.env.JWT_SECRET;
   ```

4. **Validate all inputs**
   ```javascript
   const schema = Joi.object({
     email: Joi.string().email().required(),
     password: Joi.string().min(10).required(),
   });
   ```

5. **Use prepared statements**
   - Prevents SQL injection
   - Better-sqlite3 handles this automatically

### For Users

1. **Use strong passwords**
   - Minimum 10 characters
   - Include uppercase, lowercase, and numbers

2. **Keep your JWT tokens secure**
   - Don't share them
   - Store them securely (httpOnly cookies)

3. **Enable 2FA** (when available)

4. **Regular backups**
   ```bash
   npm run backup
   ```

5. **Monitor logs**
   ```bash
   tail -f logs/error.log
   ```

## Security Features

### Current Implementation

- ✅ JWT Authentication with refresh tokens
- ✅ Password hashing (PBKDF2)
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation and sanitization
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ CSRF protection

### Planned Features

- [ ] Two-factor authentication (2FA)
- [ ] IP whitelisting
- [ ] Advanced rate limiting per endpoint
- [ ] Audit logging
- [ ] Security headers monitoring

## Known Security Considerations

### JWT Storage
- Tokens are stored in httpOnly cookies (secure)
- Consider implementing token rotation

### Session Management
- Sessions expire after 12 hours
- Consider implementing sliding sessions

### File Uploads
- Only specific file types allowed
- Maximum file size enforced
- Files stored outside web root

## Security Updates

Subscribe to security updates:
- Watch this repository on GitHub
- Follow [@GateLaunch](https://twitter.com/gatelaunch) on Twitter
- Subscribe to our security mailing list

## Contact

- **Email**: security@gatelaunch.com
- **PGP Key**: Available on request

Thank you for helping keep GateLaunch secure! 🔒

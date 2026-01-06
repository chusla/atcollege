# Security Notes

## Known Vulnerabilities

### esbuild Vulnerability (Moderate)

**Status**: Known, Acceptable Risk

**Details**:
- **Package**: esbuild (via vite/vitest dependencies)
- **Severity**: Moderate
- **CVE**: GHSA-67mh-4wv8-2f99
- **Description**: Enables any website to send requests to the development server and read the response

**Impact Assessment**:
- ✅ **Production**: No impact - vulnerability only affects development server
- ⚠️ **Development**: Low risk - requires malicious code to access your local dev server
- ✅ **Mitigation**: Only run dev server on localhost, not exposed to network

**Why This Is Acceptable**:
1. This is a **development-only** dependency (vitest)
2. The vulnerability only affects the **local development server**
3. **Production builds are not affected**
4. The risk is low for typical development workflows
5. Upgrading to fix would require breaking changes (vitest 4.x)

**Recommendations**:
- Only run `npm run dev` on localhost (default behavior)
- Don't expose dev server to external networks
- Monitor for updates to vitest that fix this issue
- Consider using `npm audit fix --force` when vitest 4.x is stable

**Last Updated**: 2025-01-06


# Security Policy

## Supported Versions

OpenConcho follows semantic versioning via [semantic-release](https://semantic-release.gitbook.io/). Only the latest minor release on `main` receives security fixes.

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

**Please do not open public issues for security reports.**

Use GitHub's [private vulnerability reporting](https://github.com/offendingcommit/openconcho/security/advisories/new) to file a report. Include:

- A description of the issue and its impact
- Steps to reproduce
- Affected version(s)
- Any mitigations you've identified

You should expect an acknowledgement within 72 hours and a fix or status update within 14 days.

## Scope

OpenConcho is a frontend client. It stores connection config (`base URL`, optional `token`) in `localStorage` under the keys `openconcho:config` and `openconcho:theme`. It makes no network requests outside the Honcho instance you configure.

In-scope:
- XSS, CSRF, or other client-side vulnerabilities in the OpenConcho UI
- Token leakage from `localStorage` to third parties
- Build-toolchain supply-chain issues

Out of scope:
- Vulnerabilities in your own Honcho instance — report those upstream at [plastic-labs/honcho](https://github.com/plastic-labs/honcho)
- Issues that require physical access to an unlocked device

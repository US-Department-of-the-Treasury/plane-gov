# Security Policy

This document outlines security protocols and vulnerability reporting guidelines for the Treasury fork of Plane.

## Reporting a Vulnerability

If you have identified a security vulnerability in this repository:

1. **Do not** open a public GitHub issue
2. Report the vulnerability through appropriate Treasury security channels
3. Include all relevant information needed to reproduce and assess the issue

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested remediation

## Responsible Disclosure

Please adhere to the following:

- Maintain confidentiality until the issue is addressed
- Do not exploit discovered vulnerabilities
- Do not run automated vulnerability scans without authorization
- Do not engage in denial of service attacks or social engineering

## Out of Scope

The following are considered out of scope:

- Vulnerabilities requiring physical access to a user's device
- Content spoofing without a clear attack vector
- Missing DNSSEC, CAA, or CSP headers
- Absence of flags on non-sensitive cookies

## Upstream Vulnerabilities

For vulnerabilities in the upstream Plane project (not specific to Treasury modifications), please report to the upstream maintainers at [makeplane/plane](https://github.com/makeplane/plane).

## Our Commitment

- We will acknowledge receipt of vulnerability reports promptly
- We will provide updates on remediation progress
- We will not take legal action against good-faith security researchers

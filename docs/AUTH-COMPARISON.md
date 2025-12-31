# Authentication Providers Comparison (2025)

Quick reference for choosing an auth provider for React/Vite apps.

## Free Tier Comparison

| Provider | Free MAU | Allowlist Free? | React DX | Best For |
|----------|----------|-----------------|----------|----------|
| **Clerk** | 10,000 | ❌ Pro ($25/mo) | ✅ Best | Modern React apps |
| **Auth0** | 7,500-25,000 | ✅ Via Actions | ⚠️ Complex | Enterprise, compliance |
| **Kinde** | 10,500 | ✅ Yes | ✅ Good | B2B SaaS with orgs |
| **SuperTokens** | 5,000 cloud / ∞ self-host | ✅ Yes | ✅ Good | Self-hosting, full control |
| **Supabase Auth** | 50,000 | ✅ Via RLS | ✅ Simple | Already using Supabase |
| **Firebase Auth** | Unlimited* | ⚠️ Custom code | ✅ Good | Google ecosystem |

*Firebase: Unlimited for email/social, paid for phone auth

## Feature Comparison

| Feature | Clerk | Auth0 | Kinde | SuperTokens |
|---------|-------|-------|-------|-------------|
| Pre-built React components | ✅ Excellent | ⚠️ Basic | ✅ Good | ✅ Good |
| Email allowlist/blocklist | Pro only | ✅ Free (Actions) | ✅ Free | ✅ Free |
| Custom domain | Pro only | Paid | ✅ Free | ✅ Free |
| Remove branding | Pro only | Paid | ✅ Free | ✅ Free |
| MFA/2FA | ✅ SMS/Email | ✅ Multiple | ✅ Yes | Paid |
| Social login (Google, etc.) | ✅ | ✅ | ✅ | ✅ |
| RBAC (roles) | ✅ Via metadata | ✅ | ✅ Built-in | ✅ |
| Organizations/Teams | ✅ | ✅ | ✅ Built-in | ⚠️ Limited |
| SOC2 Compliance | ✅ | ✅ | ✅ | ✅ |
| HIPAA Compliance | ❌ | ✅ | ❌ | ❌ |
| Self-hosting option | ❌ | ❌ | ❌ | ✅ Free |

## Pricing After Free Tier

| Provider | Cost per MAU | Notes |
|----------|--------------|-------|
| Clerk | $0.02/MAU | Linear, predictable |
| Auth0 | Tier-based | Can jump 15x at tier boundaries |
| Kinde | $0.035/MAU | Includes more features |
| SuperTokens | $0.02/MAU | Or free self-hosted |
| Supabase | $0.00325/MAU | Very cheap |

## Quick Decision Guide

### Choose **Clerk** if:
- Building modern React/Next.js app
- Want best developer experience
- Don't need free allowlist
- Predictable pricing matters

### Choose **Auth0** if:
- Need enterprise compliance (HIPAA, PCI DSS)
- Complex customization via Actions/Rules
- Need free allowlist via Actions
- Already in Okta ecosystem

### Choose **Kinde** if:
- Need free allowlist + good DX
- Building B2B SaaS with organizations
- Want built-in RBAC
- Similar ease to Clerk

### Choose **SuperTokens** if:
- Want to self-host (unlimited free)
- Need full control over auth
- Privacy/data sovereignty requirements
- Technical team comfortable with self-hosting

### Choose **Supabase Auth** if:
- Already using Supabase for database
- Want integrated auth + DB
- Need generous free tier (50k MAU)

## Implementation Complexity

| Provider | Setup Time | Learning Curve | AI-Coder Friendly |
|----------|------------|----------------|-------------------|
| Clerk | ~30 min | Easy | ✅ Excellent docs |
| Auth0 | ~1-2 hrs | Medium | ⚠️ Complex config |
| Kinde | ~30 min | Easy | ✅ Good docs |
| SuperTokens | ~1-2 hrs (cloud) / ~4 hrs (self-host) | Medium | ✅ Good docs |
| Supabase | ~30 min | Easy | ✅ Simple |

## Security Features Comparison

| Feature | Clerk | Auth0 | Kinde | SuperTokens |
|---------|-------|-------|-------|-------------|
| Bot detection | ✅ | ✅ | ✅ | Paid |
| Brute force protection | ✅ | ✅ | ✅ | Paid |
| Breached password detection | ❌ | ✅ | ❌ | ❌ |
| Session management | ✅ | ✅ | ✅ | ✅ |
| Device tracking | Pro | ✅ | ✅ | ✅ |

## Links

- [Clerk](https://clerk.com) - [Docs](https://clerk.com/docs) - [Pricing](https://clerk.com/pricing)
- [Auth0](https://auth0.com) - [Docs](https://auth0.com/docs) - [Pricing](https://auth0.com/pricing)
- [Kinde](https://kinde.com) - [Docs](https://docs.kinde.com) - [Pricing](https://kinde.com/pricing)
- [SuperTokens](https://supertokens.com) - [Docs](https://supertokens.com/docs) - [Pricing](https://supertokens.com/pricing)
- [Supabase Auth](https://supabase.com/auth) - [Docs](https://supabase.com/docs/guides/auth)

---

*Last updated: December 2025*

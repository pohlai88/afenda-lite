# Portal writing guide

Internal guide for maintainers. **Source of truth:** `lib/portal-copy.ts`.

## Audiences

| Audience | Entry | Workspace |
|----------|-------|-----------|
| **Client** | `/` | `/client/*` |
| **Organization user** | `/org/login` | `/dashboard/*` |
| **Link recipient** | `/survey/[slug]`, `/f/[token]` | None (no account) |

## Terminology

| Use | Avoid |
|-----|-------|
| Client portal | Operator portal, admin portal |
| Organization sign in | Operator sign in |
| Declaration management | Your declarations (on org dashboard) |
| Declaration | Feedback, survey |
| Organization | Operator (in UI copy) |

## File map

| Surface | Copy namespace |
|---------|----------------|
| Client sign-in `/` | `portalCopy.signIn` |
| Organization sign-in `/org/login` | `portalCopy.orgSignIn` |
| Organization dashboard | `portalCopy.org` |
| Client assignments | `portalCopy.clientDashboard` |
| Declaration pages | `portalCopy.declarationPage`, `portalCopy.declarationForm` |
| Share / invite | `portalCopy.share`, `portalCopy.invite`, `portalCopy.clientInvite` |

## Maintenance

1. Edit `lib/portal-copy.ts` only.
2. Run `npm run build`.
3. Internal code symbols (`survey`, `isAdminSession`) may remain; user-facing text uses client/organization language.

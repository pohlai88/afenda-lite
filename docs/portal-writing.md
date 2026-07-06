# Portal writing guide

Internal guide for maintainers. **Source of truth:** `lib/portal-copy.ts`.

## Mode

- **Primary mode:** internal-guide
- **Audience:** engineers updating client-portal UI text
- **Enables:** consistent copy without operator/admin framing

## Product model

This is a **client portal**, not an operator or admin portal.

| Role | Who | What they do |
|------|-----|----------------|
| Signed-in client | Business user with portal credentials | Sign in, manage declarations, share links, review submissions |
| Link recipient | Anyone with an open or secure link | Complete a declaration without signing in |

Copy must always speak to the **client** on signed-in surfaces and to the **declarant** on open/secure declaration pages.

## Terminology

| Use | Avoid |
|-----|-------|
| Client portal | Operator portal, admin portal |
| Sign in | Operator sign in, admin sign in |
| Your declarations | Survey dashboard, issue declarations |
| Declaration | Feedback, survey, poll |
| Submission | Response (in UI copy) |
| Open link / Secure link | Public client link, distribute to clients |
| Share access | Distribute, issue |

## Who-I-am pattern

1. **Signed-in clients** authenticate before accessing `/dashboard`.
2. **Link recipients** complete declarations without an account; copy must state what identity data is not collected by default.
3. **Secure links** (`/f/[token]`) hide declaration metadata in the URL.

## Voice

- Professional, trust-first, business-appropriate.
- Sentence case for labels and buttons.
- One-line helper text where possible.
- No exclamation marks in portal UI.

## File map

| Surface | Copy namespace |
|---------|----------------|
| Sign-in | `portalCopy.signIn`, `portalCopy.product` |
| Signed-in workspace (`/dashboard`) | `portalCopy.account` |
| Declaration detail | `portalCopy.declarationDetail` |
| Open declaration (`/survey/[slug]`) | `portalCopy.declarationPage` |
| Secure declaration (`/f/[token]`) | `portalCopy.declarationPage`, `portalCopy.product.secureAccessEyebrow` |
| Share / invite | `portalCopy.share`, `portalCopy.invite` |

## Maintenance

1. Edit `lib/portal-copy.ts` only.
2. Run `npm run build`.
3. Code symbols (`survey`, `isAdminSession`) may remain internal; user-facing text uses **client** and **declaration** language.

## Assumptions

- Database tables still use `surveys` / `survey_responses` internally.
- `/dashboard` is the signed-in client workspace; route name is unchanged.

## Out of scope

- End-user help articles → `user-guide-writing`
- API docs → `api-documentation`

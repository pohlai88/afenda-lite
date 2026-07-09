# Coding Agent Prompt

You are implementing a reusable cinematic authentication facade.

## Do not redesign the concept

Follow the component architecture and CSS tokens in this kit.

## Goal

Create a reusable login page system where a full-screen light owl and night owl can fade between day and night modes. The Access Vault card remains stable and readable. The owl scene, editorial copy, shield, and form card must remain separate reusable components.

## Implementation instructions

1. Copy `src/components/auth` into the app.
2. Ensure `guardian-auth-facade.css` is imported once through `GuardianAuthFacade.tsx`.
3. Place the owl PNG assets under `/public/auth/owls`.
4. Render `GuardianAuthFacade` on the login route.
5. Wire the day/night toggle to React state.
6. Wire form state to `GuardianState` later.

## Acceptance criteria

- No duplicated owl markup outside `OwlScene`.
- No duplicated card markup outside `AccessVaultCard`.
- All day/night values are controlled by `.guardian-auth--day` and `.guardian-auth--night`.
- All login visual states are controlled by `.guardian-auth--state-*`.
- The login card is readable on desktop and mobile.
- The owl feels cinematic but does not block form usability.
- Reduced motion is supported.

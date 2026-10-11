# Copilot instructions for AllTools

Follow `AGENTS.md` in the repository root; it is the entry point for all coding agents in this repository.

The detailed rules and skills are in `.agents/rules/` and `.agents/skills/`. Read the relevant files there before changing code.

Before finishing, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` and `npm run build` must pass. Keep the privacy invariants: no analytics, trackers, cookies or third-party network requests, and all user data stays on the device.

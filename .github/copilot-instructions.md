# Project instructions

## Overview
- Arnau Jimenez is the creator and maintainer of this full-stack task management and TaskBot AI app.
- `backend/`: Node.js, Express, TypeScript, Socket.IO, Prisma and PostgreSQL. Scope task and conversation access to the authenticated user.
- `frontend/`: React, Vite and Tailwind CSS. Keep components modular and preserve responsive layouts.

## LLM architecture
- Use the shared OpenAI-compatible `/chat/completions` failover in `backend/src/services/llm.service.ts` for TaskBot and the tool-using agent.
- Configure `PRIMARY_LLM_*` (DeepSeek by default) and `SECONDARY_LLM_*` (Groq by default); retain legacy `LLM_*` primary compatibility.
- Attempt providers sequentially with a 12000 ms `AbortController` timeout per attempt. TaskBot returns a local task summary when none succeeds; the agent reports failure without claiming actions succeeded.
- Never reintroduce Google Gemini SDKs or `GEMINI_API_KEY`. Do not log API keys or sensitive prompts.

## Implementation and verification
- Use strict TypeScript without `any`; validate external input and environment configuration, and use structured logging for failures.
- After changing backend or frontend code, run `npm run build` and `npm test` in each affected package. Frontend `npm test` runs only the login test; also run targeted Vitest tests for other changed behavior.
- Backend database integration tests use `npm run test:integration` and require a dedicated PostgreSQL database; do not run destructive setup against shared data.

## Git and attribution
- Preserve Arnau Jimenez's author and maintainer attribution.
- Do not automatically create commits or add `Co-authored-by` trailers; leave changes ready for Arnau Jimenez's manual review.

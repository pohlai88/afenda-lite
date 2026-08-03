---
name: Copilot Efficiency Guardrails
description: Keep chat runs focused to minimize token and credit waste
applyTo: "**/*"
---
# Copilot efficiency guardrails

- Keep scope strictly to the user request and stated done criteria.
- Prefer focused edits in known files before broad repository exploration.
- Avoid unrelated refactors, formatting-only churn, and speculative rewrites.
- Use only the minimum tools needed for the current task.
- Do not switch model, reasoning effort, or toolset during an active task unless required.
- Summarize findings briefly and only include evidence relevant to the request.

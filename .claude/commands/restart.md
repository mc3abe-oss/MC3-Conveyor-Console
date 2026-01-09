---
description: Restart the local dev server
allowed-tools: Bash(lsof:*), Bash(xargs kill:*), Bash(npm run dev:*)
---

Restart the local development server:

1. Find and kill any process running on port 3000
2. Start the dev server with `npm run dev` in the background

Do this without asking for confirmation.

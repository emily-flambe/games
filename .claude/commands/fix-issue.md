---
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - WebFetch
description: Pull a GitHub issue and implement a fix
---

# Fix GitHub Issue

Fetch and fix GitHub issue #$ARGUMENTS

## Steps

1. **Fetch the issue**
   ```bash
   gh issue view $ARGUMENTS --json title,body,labels,comments
   ```

2. **Understand the issue**
   - Read the issue description and any comments
   - Identify affected files/components
   - Determine acceptance criteria

3. **Investigate the codebase**
   - Search for relevant code using Grep/Glob
   - Read related files to understand context
   - Check existing tests for the affected area

4. **Implement the fix**
   - Make minimal, focused changes
   - Follow existing code patterns
   - Add/update tests as needed

5. **Verify the fix**
   ```bash
   npm run test:unit
   npm run test:browser
   npm run build
   ```

6. **If tests pass, report what was done**
   - List files changed
   - Explain the fix
   - Note any follow-up items

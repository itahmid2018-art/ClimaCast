# Custom Agent Instructions

## Prompt Tracking (CRITICAL)
The user has explicitly requested that **every single input prompt and AI response** must be logged for this project.

**Rule:** Every time you make a code update or fulfill a user request, you **MUST** append the latest interaction to the `/docs/prompts.md` file before finishing your turn.

### Format for appending to `docs/prompts.md`:
```markdown
## Turn [Next Number]
**User:** [Exact user prompt]
**Agent Response:** [Summary of the changes you implemented]
```

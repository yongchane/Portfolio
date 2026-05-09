# AGENTS.md — Portfolio coding workflow

## Token-efficient, quality-preserving workflow

- Prefer a fresh coding session for substantial work instead of continuing long chat history.
- Use Serena MCP for code understanding before broad file reads:
  - `get_symbols_overview` for unfamiliar files.
  - `find_symbol` / `find_referencing_symbols` for targeted TypeScript/React work.
  - `search_for_pattern` with path/glob limits when symbol lookup is not enough.
- Avoid dumping large files or broad grep output into context unless the task genuinely requires it.
- Keep verification quality high: do not skip `npm run typecheck`, `npm run lint`, or `npm run build` just to save tokens.
- Prefer small focused patches and inspect diffs before claiming completion.

## Serena project

- Serena project config lives in `.serena/project.yml`.
- Language: `typescript` only. Serena treats JavaScript through TypeScript; do not configure `javascript` as a separate language.
- Cache/local/log artifacts under `.serena/` should stay untracked.

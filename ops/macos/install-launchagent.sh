#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE_PATH="$REPO_PATH/ops/macos/portfolio-ops-watch.plist.template"
OUTPUT_PATH="$HOME/Library/LaunchAgents/com.yongchane.portfolio.ops-watch.plist"
NODE_PATH="$(command -v node)"
WORKSPACE_ROOT="${PORTFOLIO_OPS_WORKSPACE_ROOT:-$HOME/.openclaw/workspace}"
OPS_DATA_MODE="${PORTFOLIO_OPS_DATA_MODE:-auto}"
OPS_NOTE_ROOTS="${PORTFOLIO_OPS_NOTE_ROOTS:-$WORKSPACE_ROOT/obsidian-vault:$WORKSPACE_ROOT/docs}"
PATH_VALUE="${PATH:-/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin}"

if [[ ! -x "$NODE_PATH" ]]; then
  echo "node binary not found" >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents" "$REPO_PATH/.ops-runtime"

python3 - <<'PY' "$TEMPLATE_PATH" "$OUTPUT_PATH" "$NODE_PATH" "$REPO_PATH" "$WORKSPACE_ROOT" "$OPS_DATA_MODE" "$OPS_NOTE_ROOTS" "$PATH_VALUE"
import sys
from pathlib import Path

template_path, output_path, node_path, repo_path, workspace_root, ops_data_mode, ops_note_roots, path_value = sys.argv[1:9]
text = Path(template_path).read_text()
replacements = {
    "{{NODE_PATH}}": node_path,
    "{{REPO_PATH}}": repo_path,
    "{{WORKSPACE_ROOT}}": workspace_root,
    "{{OPS_DATA_MODE}}": ops_data_mode,
    "{{OPS_NOTE_ROOTS}}": ops_note_roots,
    "{{PATH_VALUE}}": path_value,
}
for old, new in replacements.items():
    text = text.replace(old, new)
Path(output_path).write_text(text)
PY

launchctl unload "$OUTPUT_PATH" >/dev/null 2>&1 || true
launchctl load "$OUTPUT_PATH"
launchctl kickstart -k "gui/$(id -u)/com.yongchane.portfolio.ops-watch"

echo "Installed LaunchAgent at $OUTPUT_PATH"
echo "Check status with: launchctl print gui/$(id -u)/com.yongchane.portfolio.ops-watch"
echo "Check /ops automation file: $REPO_PATH/data/ops/automation-status.json"

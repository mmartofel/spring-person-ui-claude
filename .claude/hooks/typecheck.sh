#!/usr/bin/env bash
# PostToolUse hook: after Claude edits a .ts/.tsx file, run the project typecheck.
# Exit code 2 sends the errors back to Claude so it fixes them before moving on.
# Does nothing until package.json has a "typecheck" script (i.e. before the scaffold exists).

input=$(cat)
file=$(printf '%s' "$input" | node -e '
  let d = "";
  process.stdin.on("data", c => (d += c)).on("end", () => {
    try { process.stdout.write(JSON.parse(d).tool_input?.file_path ?? ""); } catch {}
  });')

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0
grep -q '"typecheck"' package.json 2>/dev/null || exit 0

if ! out=$(npm run -s typecheck 2>&1); then
  echo "Typecheck failed after editing $file:" >&2
  printf '%s\n' "$out" | head -40 >&2
  exit 2
fi
exit 0

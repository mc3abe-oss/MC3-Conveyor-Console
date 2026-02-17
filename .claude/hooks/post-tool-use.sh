#!/usr/bin/env bash
# PostToolUse hook — banned pattern detection
# Fires after Write/Edit/MultiEdit. Warns on protocol violations.
# Does NOT block execution — warnings only.

FILE="$CLAUDE_TOOL_INPUT_FILE_PATH"

# Exit early if no file path provided
[[ -z "$FILE" ]] && exit 0

# Only scan TypeScript files
[[ ! "$FILE" =~ \.(ts|tsx)$ ]] && exit 0

# Skip excluded paths
[[ "$FILE" =~ __tests__/ ]] && exit 0
[[ "$FILE" =~ \.test\.(ts|tsx)$ ]] && exit 0
[[ "$FILE" =~ src/lib/logger/ ]] && exit 0
[[ "$FILE" =~ src/lib/env\.ts$ ]] && exit 0
[[ "$FILE" =~ src/lib/config/ ]] && exit 0
[[ "$FILE" =~ next\.config\. ]] && exit 0
[[ "$FILE" =~ jest\.config\. ]] && exit 0
[[ "$FILE" =~ jest\.setup\. ]] && exit 0
[[ "$FILE" =~ \.eslintrc ]] && exit 0
[[ "$FILE" =~ node_modules/ ]] && exit 0
[[ "$FILE" =~ docs/ ]] && exit 0
[[ "$FILE" =~ supabase/migrations/ ]] && exit 0

# Verify file exists
[[ ! -f "$FILE" ]] && exit 0

FOUND=0

# Helper: scan file, skip comment lines
# Usage: scan_pattern "regex" "description"
scan_pattern() {
  local pattern="$1"
  local description="$2"
  while IFS=: read -r lineno line; do
    # Strip leading whitespace for comment check
    local stripped="${line#"${line%%[![:space:]]*}"}"
    # Skip single-line comments (// ...) and JSDoc lines (* ...)
    [[ "$stripped" =~ ^// ]] && continue
    [[ "$stripped" =~ ^\* ]] && continue
    echo "⚠️ BANNED PATTERN: ${description} found in ${FILE}:${lineno}"
    FOUND=1
  done < <(grep -nE "$pattern" "$FILE" 2>/dev/null || true)
}

# 1. .catch(() => {})
scan_pattern '\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)' '.catch(() => {})'

# 2. .catch(() => null)
scan_pattern '\.catch\(\s*\(\s*\)\s*=>\s*null\s*\)' '.catch(() => null)'

# 3. .catch(() => ({}))
scan_pattern '\.catch\(\s*\(\s*\)\s*=>\s*\(\s*\{\s*\}\s*\)\s*\)' '.catch(() => ({}))'

# 4. console.log/warn/error/debug
scan_pattern 'console\.(log|warn|error|debug)\(' 'console.log/warn/error/debug'

# 5. Empty catch blocks — catch (e) { } or catch { }
scan_pattern 'catch\s*(\(\w+\))?\s*\{\s*\}' 'empty catch block'

# 6. Direct process.env. access
scan_pattern 'process\.env\.' 'direct process.env access'

if [[ "$FOUND" -eq 1 ]]; then
  echo ""
  echo "See CLAUDE.md ## Banned Patterns for alternatives."
fi

exit 0

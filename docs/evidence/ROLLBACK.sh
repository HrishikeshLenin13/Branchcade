#!/bin/sh
# Scope: restore a copy of docs/SPEC.md, not application code or Git history.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
TARGET=${1:?Usage: ROLLBACK.sh /absolute/path/to/SPEC-copy.md}
case "$TARGET" in /*) ;; *) printf 'Target must be an absolute path\n' >&2; exit 2;; esac
cp "$ROOT/docs/evidence/SPEC.original.md" "$TARGET"
printf 'Restored original specification copy.\n'

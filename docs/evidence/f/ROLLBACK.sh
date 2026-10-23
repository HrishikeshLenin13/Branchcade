#!/bin/sh
set -eu
# Restore only an explicitly named disposable constants copy, never the live checkout.
case "${1:-}" in /*) ;; *) printf '%s\n' 'Pass an absolute disposable .ts target path.' >&2; exit 2;; esac
root=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
case "$1" in "$root/src/"*) printf '%s\n' 'Use a disposable copy, not the live source tree.' >&2; exit 2;; esac
cp "$root/docs/evidence/f/constants.original.ts" "$1"
printf '%s\n' 'ROLLBACK COPIED: original constants restored on disposable target'

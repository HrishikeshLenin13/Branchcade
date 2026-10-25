#!/bin/sh
set -eu
TARGET=${1:?Pass a disposable /tmp/branchcade-astra-rollback.* fixture}
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO=$(CDPATH= cd -- "$HERE/../../../.." && pwd)
case "$TARGET" in /tmp/branchcade-astra-rollback.*) ;; *) echo 'Fixture path required'; exit 2 ;; esac
[ -f "$TARGET/.astra-rollback-fixture" ] || { echo 'Fixture marker required'; exit 2; }
[ "$TARGET" != "$REPO" ] || exit 2
while IFS= read -r file; do
  mkdir -p "$TARGET/$(dirname "$file")"
  git -C "$REPO" show "02ce0dddafad5d0b9bd9e529bb0641a0a4e2fd80:$file" > "$TARGET/$file"
done < "$HERE/rollback-paths.txt"
echo 'ROLLBACK PASS: original runtime source restored in disposable fixture; live checkout unchanged'

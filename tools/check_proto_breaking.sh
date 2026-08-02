#!/usr/bin/env bash
# Run buf breaking change detection against main branch.
# Called from CI when packages/contracts/ changes.
# Enforces WIRE_JSON rules — protects both Go and Python deserializers.
set -euo pipefail
buf breaking packages/contracts \
  --against "https://github.com/usena/sentra.git#branch=main,subdir=packages/contracts"
echo "buf breaking check PASSED — no WIRE_JSON breaking changes."


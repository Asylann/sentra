#!/usr/bin/env bash
# Regenerate Go and Python stubs from Protobuf schemas using buf.
# Run this after modifying any .proto file.
set -euo pipefail
buf generate packages/contracts
echo "Protobuf stubs regenerated in packages/contracts/gen/"


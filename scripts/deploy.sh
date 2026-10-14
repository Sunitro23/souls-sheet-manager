#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
docker compose config --quiet
docker compose build souls
docker compose up -d --no-build --wait --wait-timeout 180 souls cendres-owlbear
docker compose ps

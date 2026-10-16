#!/usr/bin/env bash
# Signs gcloud in as the read-only service account from $GCP_SA_KEY (issue #27).
# The key goes to a private temp file that is removed on exit; it is never printed.
set -euo pipefail

if [ -z "${GCP_SA_KEY:-}" ]; then
  echo "GCP_SA_KEY is not set" >&2
  exit 1
fi

umask 077
key_file="$(mktemp)"
trap 'rm -f "$key_file"' EXIT

printenv GCP_SA_KEY > "$key_file"
gcloud auth activate-service-account --key-file="$key_file" --quiet
gcloud config set project starboard-family --quiet

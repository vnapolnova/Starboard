#!/usr/bin/env bash
# Signs gcloud in as the read-only service account from $GCP_SA_KEY (issue #27).
# The key goes to a private temp file that is removed on exit; it is never printed.
set -euo pipefail

if [ -z "${GCP_SA_KEY:-}" ]; then
  echo "GCP_SA_KEY is not set" >&2
  exit 1
fi

# Cloud sessions set a placeholder CLOUDSDK_AUTH_ACCESS_TOKEN, which overrides
# any account gcloud signs in with. Drop it here; later gcloud commands in the
# session need the same, as `env -u CLOUDSDK_AUTH_ACCESS_TOKEN gcloud ...`.
unset CLOUDSDK_AUTH_ACCESS_TOKEN

umask 077
key_file="$(mktemp)"
trap 'rm -f "$key_file"' EXIT

printenv GCP_SA_KEY > "$key_file"
gcloud auth activate-service-account --key-file="$key_file" --quiet
gcloud config set project starboard-family --quiet

echo "Signed in as $(gcloud config get-value account 2>/dev/null)."
echo "Run gcloud as: env -u CLOUDSDK_AUTH_ACCESS_TOKEN gcloud ..."

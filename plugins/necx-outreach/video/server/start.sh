#!/bin/sh
# Starts the local NECX Video connector (server/local.mjs). Claude Desktop and
# Cowork launch plugins without your shell's PATH, so look for Node 18+ in the
# usual places, and if there is none, download a private copy (once) into
# ~/.necx-outreach/node. stdout is the MCP channel: messages go to stderr.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
CACHE="$HOME/.necx-outreach"
NODE_VERSION="22.11.0"

ok() { [ -x "$1" ] && [ "$("$1" -p 'process.versions.node.split(".")[0] >= 18' 2>/dev/null)" = "true" ]; }

try_node() {
  if ok "$1"; then
    PATH="$(dirname "$1"):$PATH" exec "$1" --no-warnings "$HERE/local.mjs"
  fi
}

[ -n "${NODE:-}" ] && try_node "$NODE"
try_node "$CACHE/node/bin/node"
command -v node >/dev/null 2>&1 && try_node "$(command -v node)"
for n in $(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -rV 2>/dev/null || ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null); do try_node "$n"; done
for n in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.volta/bin/node" "$HOME/.local/bin/node" /usr/bin/node; do try_node "$n"; done
for n in $(ls -d "$HOME"/.local/share/fnm/node-versions/*/installation/bin/node "$HOME"/Library/Application\ Support/fnm/node-versions/*/installation/bin/node 2>/dev/null); do try_node "$n"; done

# none found: fetch a private Node
case "$(uname -s)" in Darwin) os=darwin ;; Linux) os=linux ;; *) echo "[necx-video] unsupported OS $(uname -s); install Node 18+ from nodejs.org" >&2; exit 1 ;; esac
case "$(uname -m)" in arm64|aarch64) arch=arm64 ;; x86_64|amd64) arch=x64 ;; *) echo "[necx-video] unsupported CPU $(uname -m)" >&2; exit 1 ;; esac
echo "[necx-video] Node 18+ not found; downloading Node $NODE_VERSION (one time)…" >&2
mkdir -p "$CACHE"
tmp="$CACHE/node-download"
rm -rf "$tmp" && mkdir -p "$tmp"
if curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-$os-$arch.tar.gz" | tar -xz -C "$tmp" >&2; then
  rm -rf "$CACHE/node" && mv "$tmp/node-v$NODE_VERSION-$os-$arch" "$CACHE/node" && rm -rf "$tmp"
  try_node "$CACHE/node/bin/node"
fi
echo "[necx-video] couldn't get Node. Install Node 18+ from https://nodejs.org and restart Claude." >&2
exit 1

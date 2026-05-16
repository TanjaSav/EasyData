#!/usr/bin/env bash
cd /home/tanja/easydata || exit 1
exec ./node_modules/.bin/tsx src/mcp/server.ts

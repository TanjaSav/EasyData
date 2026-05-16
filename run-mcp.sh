#!/usr/bin/env bash
cd /home/tanja/easydata || exit 1
exec /home/tanja/easydata/node_modules/.bin/tsx /home/tanja/easydata/src/mcp/server.ts 2>> /home/tanja/easydata/mcp-error.log
#!/bin/sh
set -eu

PATH="./node_modules/.bin:$PATH"
export PATH

NODE_ENV=development exec tsx watch server.ts

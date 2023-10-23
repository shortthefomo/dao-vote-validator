#!/bin/bash
export NODE_ENV=production
export DEBUG=dao-vote*
export DEBUG_COLORS=true
pm2 start ./src/index.js --name dao-vote-validator --time
#!/usr/bin/env bash
if ! command -v reflex
then
    echo "Please install https://github.com/cespare/reflex"
    echo "go install github.com/cespare/reflex@latest"
    exit 1
fi
reflex -r 'grammar.js$|\.txtt$' -- sh -c 'tree-sitter generate && node-gyp build && tree-sitter test'

# Goals

- Tree sitter grammer for bloblang
- Highlighting for bloblang
- Multidocument grammar for benthos configs
  - [ ] YAML grammer + bloblang grammer merge
  - [ ] If new config lang used for benthos (CUE/dhall etc) do the same here.

# TODO

## Parsing features

- [ ] arithmetic
- [x] comments. Note: our comment parsing is more forgiving than bloblang? find example.
- [x] triple quoted strings
- [ ] make query hidden in tree
- [ ] do literal numbers still work precedence wise with paths?
- [ ] if: show else if / else nodes in tree
- [ ] fix: named args vs varName/path segment
- [ ] varname vs snakecase. How to avoid ending with "(" or ":" in functionName/argName ??
- [ ] name-the-context after dot. Add node in tree!
- [ ] object literals, group key value pairs in under common node?
- [ ] AUTOMATE INTEGRATION TEST: parse all bloblang scripts in benthos docs for errors

## when parsing done

Current parser maps pretty 1-1 to the golang parser code. This made it easier to port the go code to a grammer. But it may not give optimal tree structure/node names, as described in the tres-sitter docs.

Consider if this should be restructured

- [ ] Better nodenames / tree structure. Refactor parser?

# Goals

- Highlighting for [bloblang](https://www.benthos.dev/docs/guides/bloblang/about) (.blobl)
- Multidocument grammar for benthos configs
  - [ ] YAML grammer + bloblang grammer injection
  - [ ] Ditto for other potential configuration languages used with benthos (CUE/dhall)

# Dev

A few development scripts are found in `bin/dev`. I use `reflex` to re-run tests on code changes.
Look in `dev` script. A simple integration test is available `integration_test`, which parses
all scripts from the benthos documentation.

# Improvements

You can help!

- [ ] Improvements can be made to the structure of the parse tree. Adding more field names etc.
- [ ] More advanced highlighting features, such as variable scopes.
- [ ] Enable bloblang injection into a YAML tree-sitter parse tree, giving proper syntax highlighting for benthos configuration files.
- [ ] Current parser is more lenient and does not match 1-1 with the reference implementation. One example
      is variable/function names. We have no restrictions to snakecase. Also, I belive we allow more whitespace and comments
      than the reference implementation.

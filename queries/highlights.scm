; keywords
[
  "map"
  "match"
  "if"
  "else"
  "import"
  "let"
  "meta"
  ( root )
  ( this )
] @keyword

; operators
[
  "-"
  "!"
  "!="
  "*"
  "/"
  "&&"
  "%"
  "+"
  "->"
  "<"
  "<="
  "=>"
  "="
  "=="
  ">"
  ">="
  "|"
  "||"
] @operator

; identifiers
(variable) @variable
(pathSegment) @property

; function and method calls

(functionExpression name: (functionName) @function)
((argName) @variable.parameter)

[
  ","
  "."
] @punctuation.delimiter

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

; literals

[
 (tripleQuotedString)
 (quotedString)
] @string

(number) @number

[
 (bool)
 (null)
] @constant.builtin

((object key: ((_) @property)))

(comment) @comment

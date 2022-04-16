const PREC = {
  primary: 8,
  lambda: 7,
  unary: 6,
  multiplicative: 5,
  additive: 4,
  comparative: 3,
  and: 2,
  or: 1,
  composite_literal: -1,
};

multiplicative_operators = ["*", "/", "%"];
additive_operators = ["+", "-", "|"];
comparative_operators = ["==", "!=", "<", "<=", ">", ">="];

identifier = /[A-Za-z0-9_]+/;
snake_case = /[a-z0-9_]+/;
number = /[0-9]+(\.[0-9]+)?/;

module.exports = grammar({
  name: "bloblang",

  extras: ($) => [/\s/, $.comment],
  supertypes: ($) => [$._statement],
  inline: ($) => [$.string_fragment],

  rules: {
    // TODO: add the actual grammar rules
    program: ($) => seq(repeat($._statement)),

    comment: ($) => token(/#.*\n/),
    word: ($) => choice($.snakeCase, $.varName),

    // mapping_parser.go : func parseExecutor(pCtx Context) Func {
    _statement: ($) =>
      choice($.importStmt, $.mapStmt, $.letStmt, $.metaStmt, $.assignment),

    importStmt: ($) => seq("import", $.quotedString),

    // TODO: allow meta statements here? see bloblang parser source. They are disabled i believe
    // meta statements disabled atm in mapParser
    mapStmt: ($) =>
      seq(
        "map",
        choice($.quotedString, $.varName),
        "{",
        repeat(choice($.letStmt, $.assignment)),
        "}"
      ),

    letStmt: ($) => seq("let", choice($.quotedString, $.varName), "=", $.query),

    metaStmt: ($) =>
      seq("meta", choice($.quotedString, $.varName), "=", $.query),

    assignment: ($) => seq($.path, "=", $.query),

    // TODO: test plain mapping stmt with path again!
    // see mapping_parser.go -> pathParser
    // NOTE: can not start with quoted path segment? why? check?
    path: ($) => seq($.pathSegment, repeat(seq(".", $._fullPathSegment))),

    firstPathSegment: ($) => token(/[A-Za-z_][A-Za-z0-9_]*/),
    pathSegment: ($) => $.varName,
    quotedPathSegment: ($) => $.quotedString,
    _fullPathSegment: ($) => choice($.pathSegment, $.quotedPathSegment),

    // rootParser := parseWithTails(Expect(
    // 	OneOf(
    //
    // 		fieldLiteralRootParser(pCtx),
    // 		functionParser(pCtx),
    // 		bracketsExpressionParser(pCtx),
    // 		lambdaExpressionParser(pCtx),
    // 		variableLiteralParser(),
    // 		literalValueParser(pCtx),
    // 		matchExpressionParser(pCtx),
    // 		ifExpressionParser(pCtx),
    // 	),
    // 	"query",
    // ), pCtx)
    // return func(input []rune) Result {
    // 	res := SpacesAndTabs()(input)
    // 	return arithmeticParser(rootParser)(res.Remaining)
    // }
    // TODO: arithmetic, and chained with . type expressions (parse with tails stuff)

    unary_query: ($) =>
      prec(
        PREC.unary,
        seq(field("operator", choice("-", "!")), field("operand", $.query))
      ),

    binary_query: ($) => {
      const table = [
        [PREC.multiplicative, choice(...multiplicative_operators)],
        [PREC.additive, choice(...additive_operators)],
        [PREC.comparative, choice(...comparative_operators)],
        [PREC.and, "&&"],
        [PREC.or, "||"],
      ];
      return choice(
        ...table.map(([precedence, operator]) =>
          prec.left(
            precedence,
            seq(
              field("left", $.query),
              field("operator", operator),
              field("right", $.query)
            )
          )
        )
      );
    },

    query: ($) =>
      choice(
        $.variable,
        $._literal,
        $.matchExpression,
        $.ifExpression,
        $.lambdaExpression,
        $.bracketExpression,
        $.functionExpression,
        $.unary_query,
        $.binary_query,
        alias($.varName, $.firstPathSegment),
        // $.firstPathSegment,
        prec.right(
          PREC.primary,
          seq(
            $.query,
            repeat1(
              seq(
                token("."),
                choice(
                  alias(seq("(", $.query, ")"), $.nameTheContext),
                  alias($.functionExpression, $.method),
                  $._fullPathSegment
                )
              )
            )
          )
        )
      ),

    functionExpression: ($) =>
      seq(
        $.functionName,
         optional(
          seq(
            $._argExpression,
            repeat(seq(",", $._argExpression))
          ),
        ),
        ")",
      ),

    // bloblang can not mix named/nameless args
    // but for syntax highlighting we do not care?
    _argExpression: $ => seq(
      optional($.argName),
      alias($.query, $.argValue),
    ),

    bracketExpression: ($) =>
      seq(
        alias(token("("), $.openingBracket),
        $.query,
        alias(token(")"), $.closingBracket)
      ),

    lambdaExpression: ($) =>
    prec.right(PREC.lambda, seq(alias($.varName, $.contextName), "->", $.query)),

    matchExpression: ($) =>
      prec(
        2,
        seq(
          token("match"),
          alias(optional($.query), $.context),
          "{",
          repeat(
            seq(
              $.matchCase,
              choice("\n", ",") // TODO: comments? is this a proper way to handle this?
            )
          ),
          "}"
        )
      ),

    matchCase: ($) =>
      seq(
        alias(choice(token("_"), $.query), $.condition),
        "=>",
        alias($.query, $.expression)
      ),

    ifExpression: ($) =>
      seq(
        "if",
        alias($.query, $.condition),
        "{",
        $.query,
        "}",
        optional(
          seq(
            optional(
              repeat(
                seq("else if", alias($.query, $.condition), "{", $.query, "}")
              )
            ),
            optional(seq("else", "{", $.query, "}"))
          )
        )
      ),

    // Boolean(),
    // Number(),
    // Null(),
    // QuotedString(),
    // TripleQuoteString(), TODO: not done.... ?
    // dynamicArrayParser(pCtx),
    // dynamicObjectParser(pCtx),
    _literal: ($) =>
      choice(
        $.bool,
        $.null,
        $.number,
        $.tripleQuotedString,
        $.quotedString,
        $.array,
        $.object
      ),

    bool: ($) => choice("true", "false"),
    null: ($) => token("null"),
    number: ($) => number,
    tripleQuotedString: ($) => seq('"""', repeat(choice(/./, /\n/)), '"""'),
    quotedString: ($) => seq('"', repeat(token.immediate(/[^"]+/)), '"'),
    array: ($) =>
      seq(
        "[",
        optional(
          seq(
            alias($.query, $.value),
            repeat(seq(",", alias($.query, $.value))),
            optional(",")
          )
        ),
        "]"
      ),
    object: ($) =>
      seq(
        "{",
        optional(
          seq(
            seq(alias($.query, $.key), ":", alias($.query, $.value)),
            repeat(seq(",", alias($.query, $.key), ":", alias($.query, $.value))),
            optional(","),
          ),
        ),
        "}",
      ),

    variable: ($) => seq("$", identifier),

    snakeCase: ($) => token(/[a-z0-9_]+/),
    varName: ($) => token(/[A-Za-z0-9_]+/),
    functionName: $ => token(/[a-z0-9_]+\(/),
    argName: $ => token(/[a-z0-9_]+:/),
    _num: ($) => token(/[0-9]+(\.[0-9]+)?/),
  },
});

const PREC = {
  primary: 7,
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

module.exports = grammar({
  name: "bloblang",

  extras: ($) => [/\s/, $.comment],
  supertypes: $ => [
    $._statement,
  ],


  rules: {
    // TODO: add the actual grammar rules
    program: ($) => seq(repeat($._statement)),

    comment: ($) => token(/#.*\n/),
    word: ($) => choice($.snakeCase, $.varName),

    // mapping_parser.go : func parseExecutor(pCtx Context) Func {
    _statement: ($) =>
      choice(
        $.importStmt,
        $.mapStmt,
        $.letStmt,
        $.metaStmt,
        $.assignment
      ),

    importStmt: ($) => seq("import", $.quotedString),

    mapStmt: ($) =>
      seq(
        "map",
        choice($.quotedString, $.varName),
        "{",
        choice($.letStmt, $.metaStmt, $.assignment),
        "}"
      ),

    letStmt: ($) => seq("let", choice($.quotedString, $.varName), "=", $.query),

    metaStmt: ($) =>
      seq("meta", choice($.quotedString, $.varName), "=", $.query),

    assignment: ($) => seq($.path, "=", $.query),

    // TODO: test plain mapping stmt with path again!
    path: ($) =>
      seq(
        alias($.varName, $.pathLiteralSegment),
        optional(
          repeat(
            seq(
              ".",
              choice(
                alias($.varName, $.pathLiteralSegment),
                alias($.quotedString, $.quotedPathLiteralSegment)
              )
            )
          )
        )
        // see mapping_parser.go -> pathParser
      ),

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
        alias($.firstQueryPath, $.fieldLiteralRoot),
        prec.right(seq(
          $.query,
          repeat1(
            seq(
              ".",
              choice(
                seq("(", $.query, ")"),
                $.functionExpression,
                choice(
                  alias($.varName, $.pathLiteralSegment),
                  alias($.quotedString, $.quotedPathLiteralSegment)
                )
              )
            )
          )
        ))
      ),

    _rootQuery: ($) =>
        choice(
          $.variable,
          $._literal,
          $.matchExpression,
          $.ifExpression,
          $.lambdaExpression,
          $.bracketExpression,
          $.functionExpression,
          alias($.firstQueryPath, $.fieldLiteralRoot)
      ),


    _chain: ($) =>
      prec.right(
        repeat1(
          seq(
            ".",
            choice(
              seq("(", $.query, ")"),
              $.functionExpression,
              choice(
                alias($.varName, $.pathLiteralSegment),
                alias($.quotedString, $.quotedPathLiteralSegment)
              )
            )
          )
        )
      ),

    _queryS: ($) => seq($.query, optional($._chain)),

    functionExpression: ($) =>
      seq(alias($.snakeCase, $.function), $.functionArgsExpression),

    functionArgsExpression: ($) =>
      seq(
        "(",
        optional(
          seq(
            choice($.query, $.namedArgExpression),
            repeat(seq(",", choice($.query, $.namedArgExpression)))
          )
        ),
        ")"
      ),

    namedArgExpression: ($) =>
      seq(alias($.snakeCase, $.argName), ":", alias($.query, $.argValue)),

    bracketExpression: ($) =>
      seq(
        alias(token("("), $.openingBracket),
        $.query,
        alias(token(")"), $.closingBracket)
      ),

    lambdaExpression: ($) =>
      prec(
        PREC.primary,
        seq(alias($.varName, $.contextName), token("->"), $.query)
      ),

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
        $.litBool,
        $.litNumber,
        $.litNull,
        $.tripleQuotedString,
        $.quotedString,
        $.litDynamicArray,
        $.litDynamicObject
      ),

    litDynamicArray: ($) =>
      seq("[", repeat(seq(alias($.query, $.value), ",")), "]"),

    litDynamicObject: ($) =>
      seq(
        "{",
        repeat(seq(alias($.query, $.key), ":", alias($.query, $.value), ",")),
        "}"
      ),

    litBool: ($) => choice("true", "false"),
    litNull: ($) => token("null"),



    // we remove the optional `-` vs bloblang parsing
    litNumber: ($) => $._num,
    // prec.right(10, seq($.num, optional(seq(".", $.num)))),

    variable: ($) => seq("$", $.varName),

    // TODO: from js parser? will this work?
    quotedString: ($) =>
      seq(
        '"',
        repeat(
          choice(
            alias($.unescaped_double_string_fragment, $.string_fragment),
            $.escape_sequence
          )
        ),
        '"'
      ),

    tripleQuotedString: ($) => seq('"""', repeat(choice(/./, /\n/)), '"""'),

    unescaped_double_string_fragment: ($) =>
      token.immediate(prec(1, /[^"\\]+/)),
    escape_sequence: ($) =>
      token.immediate(
        seq(
          "\\",
          choice(
            /[^xu0-7]/,
            /[0-7]{1,3}/,
            /x[0-9a-fA-F]{2}/,
            /u[0-9a-fA-F]{4}/,
            /u{[0-9a-fA-F]+}/
          )
        )
      ),

    firstQueryPath: ($) => /[A-Za-z_][A-Za-z0-9_]*/,
    varName: ($) => /[A-Za-z0-9_]+/,
    snakeCase: ($) => /[a-z0-9_]+/,
    _num: ($) => /[0-9]+(.[0-9]+)?/,
  },
});

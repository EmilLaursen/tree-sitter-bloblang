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

    comment: ($) => token(/#.*/),
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
        alias(choice($.quotedString, $.varName), $.mapName),
        "{",
        repeat(choice($.letStmt, $.assignment)),
        "}"
      ),

    letStmt: ($) => seq("let", choice($.quotedString, $.varName), "=", $._query),

    metaStmt: ($) =>
      seq("meta", choice($.quotedString, $.varName), $.assign, $._query),

    assign: $ => "=",
    assignment: ($) => seq(
      field("left", $._path),
      $.assign,
      field("right", $._query),
    ),

    // TODO: test plain mapping stmt with path again!
    // see mapping_parser.go -> pathParser
    // NOTE: can not start with quoted path segment? why? check?
    _path: ($) => seq(choice($.root, $.pathSegment), repeat(seq(".", $._fullPathSegment))),

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
        seq(field("operator", choice("-", "!")), field("operand", $._query))
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
              field("left", $._query),
              field("operator", operator),
              field("right", $._query)
            )
          )
        )
      );
    },

    root: $ => "root",
    this: $ => "this",

    _query: ($) =>
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
        $.this,
        $.pathSegment,
        // $.firstPathSegment,
        prec.right(
          PREC.primary,
          seq(
            $._query,
            repeat1(
              seq(
                token("."),
                choice(
                  $.namedContext,
                  $.methodCall,
                  $._fullPathSegment
                )
              )
            )
          )
        )
      ),

    namedContext: $ => seq("(", $._query, ")"),
    methodCall: $ => $.functionExpression,

    functionExpression: ($) =>
      seq(
        field("name", $.functionName),
        field("parameters", optional(
          seq(
            $._argExpression,
            repeat(seq(",", $._argExpression))
          ),
        )),
        ")",
      ),

    // bloblang can not mix named/nameless args
    // but for syntax highlighting we do not care?
    _argExpression: $ => seq(
      field("arg_name", optional($.argName)),
      field("arg_value", alias($._query, $.argValue)),
    ),

    bracketExpression: ($) =>
      seq(
        alias(token("("), $.openingBracket),
        $._query,
        alias(token(")"), $.closingBracket)
      ),

    lambdaExpression: ($) =>
    prec.right(
      PREC.lambda,
      seq(
        field("arg_name", $.varName),
        field("arrow",  "->"),
        field("body", $._query),
      )),

    matchExpression: ($) =>
      prec(
        2,
        seq(
          token("match"),
          field("condition", optional($._query)),
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
        field("condition", choice(token("_"), $._query)),
        "=>",
        field("consequence", $._query),
      ),

    ifExpression: ($) =>
      seq(
        "if",
        field("condition", $._query),
        "{",
        field("consequence", $._query),
        "}",
        optional(
          seq(
            "else",
            field("alternative", choice($.ifExpression, seq("{", $._query, "}"))),
          )
        )
      ),

    // Boolean(),
    // Number(),
    // Null(),
    // QuotedString(), TODO: escape sequences not handles. figure out which ones are valid in bloblang. Same as golang?
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
            field("value", $._query),
            repeat(seq(",", field("value", $._query))),
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
            seq(
              field("key", $._query), ":", field("value", $._query)
            ),
            repeat(seq(",", field("key", $._query), ":", field("value", $._query))),
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

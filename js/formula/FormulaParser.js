// Guesstinote - Formula Parser
// Converts a formula string into an Abstract Syntax Tree (AST).

const FormulaParser = (() => {
    // Token types
    const TOKEN_TYPES = {
        NUMBER: 'NUMBER',
        IDENTIFIER: 'IDENTIFIER', // For function names and cell IDs
        STRING: 'STRING', // If we ever need string literals
        LPAREN: 'LPAREN',   // (
        RPAREN: 'RPAREN',   // )
        COMMA: 'COMMA',    // ,
        PLUS: 'PLUS',      // +
        MINUS: 'MINUS',    // -
        MUL: 'MUL',        // *
        DIV: 'DIV',        // /
        POW: 'POW',        // ^
        KEYWORD_TO: 'KEYWORD_TO', // for "X to Y" syntax
        EOF: 'EOF',        // End Of File/Formula
    };

    function tokenize(input) {
        const tokens = [];
        let cursor = 0;

        while (cursor < input.length) {
            let char = input[cursor];

            if (/\s/.test(char)) { // Skip whitespace
                cursor++;
                continue;
            }

            if (/[0-9]/.test(char)) {
                let numStr = '';
                while (cursor < input.length && (/[0-9]/.test(input[cursor]) || (input[cursor] === '.' && !numStr.includes('.')))) {
                    numStr += input[cursor++];
                }
                if (numStr.endsWith('.')) throw new Error(`Tokenizer Error: Number cannot end with a decimal point: "${numStr}"`);
                tokens.push({ type: TOKEN_TYPES.NUMBER, value: parseFloat(numStr) });
                continue;
            }

            if (/[a-zA-Z_]/.test(char)) { // Identifiers (functions, cell IDs) or "to" keyword
                let identStr = '';
                while (cursor < input.length && /[a-zA-Z0-9_]/.test(input[cursor])) {
                    identStr += input[cursor++];
                }
                if (identStr.toLowerCase() === 'to') {
                    tokens.push({ type: TOKEN_TYPES.KEYWORD_TO });
                } else {
                    tokens.push({ type: TOKEN_TYPES.IDENTIFIER, value: identStr });
                }
                continue;
            }
            
            switch (char) {
                case '(': tokens.push({ type: TOKEN_TYPES.LPAREN }); cursor++; continue;
                case ')': tokens.push({ type: TOKEN_TYPES.RPAREN }); cursor++; continue;
                case ',': tokens.push({ type: TOKEN_TYPES.COMMA }); cursor++; continue;
                case '+': tokens.push({ type: TOKEN_TYPES.PLUS }); cursor++; continue;
                case '-': tokens.push({ type: TOKEN_TYPES.MINUS }); cursor++; continue;
                case '*': tokens.push({ type: TOKEN_TYPES.MUL }); cursor++; continue;
                case '/': tokens.push({ type: TOKEN_TYPES.DIV }); cursor++; continue;
                case '^': tokens.push({ type: TOKEN_TYPES.POW }); cursor++; continue;
            }

            throw new Error(`Tokenizer Error: Unrecognized character "${char}" at position ${cursor}`);
        }

        tokens.push({ type: TOKEN_TYPES.EOF });
        return tokens;
    }

    // AST Node types (examples)
    // { type: 'NumberLiteral', value: 123 }
    // { type: 'CellIdentifier', name: 'CellA' }
    // { type: 'FunctionCall', name: 'PERT', args: [arg1Node, arg2Node, ...] }
    // { type: 'BinaryOp', operator: '+', left: leftNode, right: rightNode }
    // { type: 'RangeExpression', left: leftNode, right: rightNode } // For "X to Y"

    // Parser (Recursive Descent with Pratt-like handling for precedence)
    let currentTokens = [];
    let position = 0;

    function peek() { return currentTokens[position]; }
    function previous() { return currentTokens[position - 1]; }
    function isAtEnd() { return peek().type === TOKEN_TYPES.EOF; }
    function advance() { if (!isAtEnd()) position++; return previous(); }
    function check(type) { if (isAtEnd()) return false; return peek().type === type; }
    function match(...types) {
        for (const type of types) {
            if (check(type)) {
                advance();
                return true;
            }
        }
        return false;
    }
    function consume(type, message) {
        if (check(type)) return advance();
        throw new Error(`Parser Error: ${message}. Found ${peek().type} instead of ${type}.`);
    }

    // Operator precedence
    const PRECEDENCE = {
        [TOKEN_TYPES.KEYWORD_TO]: 10, // "X to Y"
        [TOKEN_TYPES.PLUS]: 20,
        [TOKEN_TYPES.MINUS]: 20,
        [TOKEN_TYPES.MUL]: 30,
        [TOKEN_TYPES.DIV]: 30,
        [TOKEN_TYPES.POW]: 40, // Right-associative, handled in parsePower
    };

    function getPrecedence(tokenType) {
        return PRECEDENCE[tokenType] || 0;
    }

    function parseExpression(precedence = 0) {
        let left = parsePrefix();

        while (precedence < getPrecedence(peek().type) && peek().type !== TOKEN_TYPES.KEYWORD_TO) {
            const operatorToken = advance();
            const right = parseExpression(getPrecedence(operatorToken.type));
            left = { type: 'BinaryOp', operator: operatorToken.type, left, right };
        }
        
        // Handle "X to Y" separately as it's not a standard binary op in the same loop
        if (match(TOKEN_TYPES.KEYWORD_TO)) {
            // "to" has lower precedence, so it should consume the expression parsed so far as its left.
            const right = parseExpression(getPrecedence(TOKEN_TYPES.KEYWORD_TO));
            left = { type: 'RangeExpression', left, right };
        }

        return left;
    }
    
    // Power is right-associative
    function parsePower() {
        let left = parseAtom();
        if (match(TOKEN_TYPES.POW)) {
            // For right-associativity, the right operand is parsed with precedence one less than POW's own.
            // Or, more simply for now, just recurse:
            const right = parsePower(); // Recurse for right-associativity
            return { type: 'BinaryOp', operator: TOKEN_TYPES.POW, left, right };
        }
        return left;
    }


    function parsePrefix() {
        if (match(TOKEN_TYPES.NUMBER)) {
            return { type: 'NumberLiteral', value: previous().value };
        }
        if (match(TOKEN_TYPES.IDENTIFIER)) {
            const identifier = previous();
            if (match(TOKEN_TYPES.LPAREN)) { // Function call
                const args = [];
                if (!check(TOKEN_TYPES.RPAREN)) {
                    do {
                        args.push(parseExpression());
                    } while (match(TOKEN_TYPES.COMMA));
                }
                consume(TOKEN_TYPES.RPAREN, "Expected ')' after function arguments");
                return { type: 'FunctionCall', name: identifier.value, args };
            }
            return { type: 'CellIdentifier', name: identifier.value }; // Cell ID
        }
        if (match(TOKEN_TYPES.LPAREN)) { // Grouping
            const expr = parseExpression();
            consume(TOKEN_TYPES.RPAREN, "Expected ')' after expression in parentheses");
            return expr;
        }
        if (match(TOKEN_TYPES.MINUS)) { // Unary minus
            const operand = parsePrefix(); // Or parseExpression with higher precedence
            return { type: 'UnaryOp', operator: TOKEN_TYPES.MINUS, operand };
        }

        throw new Error(`Parser Error: Expected expression, found ${peek().type}`);
    }
    
    function parse(inputFormula) {
        if (typeof inputFormula !== 'string' || inputFormula.trim() === '') {
            throw new Error("Parser Error: Formula cannot be empty.");
        }
        currentTokens = tokenize(inputFormula);
        position = 0;
        
        const ast = parseExpression();
        if (!isAtEnd()) {
            throw new Error(`Parser Error: Unexpected token ${peek().type} after expression.`);
        }
        return ast;
    }

    return {
        parse,
        TOKEN_TYPES // Expose for potential use elsewhere if needed
    };
})();

window.FormulaParser = FormulaParser; // Make globally available
console.log('formula_parser.js loaded');

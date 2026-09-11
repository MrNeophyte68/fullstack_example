const sharedRestrictedSyntax = [
    {
        selector: 'TSTypeLiteral:not(TSTypeAliasDeclaration TSTypeLiteral)',
        message: 'Avoid anonymous inline object types. Declare a named interface or type alias instead.',
    },
];

export default (tsParser, tsPlugin) => [
    {
        ignores: ['projects/**/*', 'node_modules/**/*', 'out/**/*', 'coverage/**/*'],
    },
    {
        files: ['**/*.js', '**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                global: 'readonly',
            },
        },
        rules: {
            'no-console': 'error',
            'no-debugger': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'no-else-return': 'error',
            'default-case-last': 'error',
            'no-param-reassign': ['error', { props: true }],
            'quotes': ['error', 'single', { avoidEscape: true }],
            'semi': ['error', 'always'],
            'eqeqeq': ['error', 'smart'],
            'no-duplicate-imports': 'error',
            'no-multiple-empty-lines': 'error',
            'no-nested-ternary': 'error',
            'no-unneeded-ternary': 'error',
            'no-lonely-if': 'error',
            'brace-style': ['error', '1tbs'],
            'complexity': ['error', 15],
            'max-depth': ['error', 4],
            'comma-dangle': ['error', 'always-multiline'],
            'max-len': ['error', { code: 150, ignoreComments: true, ignoreTrailingComments: true }],
            'max-lines': ['error', { max: 350, skipBlankLines: true, skipComments: true }],
            'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
            'max-params': ['error', 5],
            'max-classes-per-file': ['error', 2],
            'no-bitwise': 'error',
            'no-caller': 'error',
            'no-cond-assign': 'error',
            'no-empty': 'error',
            'no-unreachable': 'error',
            'prefer-template': 'error',
            'no-eval': 'error',
            'no-invalid-this': 'error',
            'no-restricted-imports': ['error', { 'patterns': ['../*'] }],
            'no-fallthrough': 'error',
            'no-new-wrappers': 'error',
            'no-throw-literal': 'error',
            'no-return-assign': 'error',
            'no-undef-init': 'error',
            'no-unsafe-finally': 'error',
            'no-unused-labels': 'error',
            'object-shorthand': 'error',
            'one-var': ['error', 'never'],
            'one-var-declaration-per-line': 'error',
            'quote-props': ['error', 'consistent-as-needed'],
            'radix': 'error',
            'use-isnan': 'error',
            'guard-for-in': 'error',
        },
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            },
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/dot-notation': 'error',
            '@typescript-eslint/return-await': ['error', 'in-try-catch'],
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
            '@typescript-eslint/no-unused-expressions': 'error',
            '@typescript-eslint/no-useless-constructor': 'error',
            '@typescript-eslint/no-magic-numbers': [
                'error',
                {
                    ignore: [-1, 0, 1, 2],
                    ignoreArrayIndexes: true,
                    ignoreEnums: true,
                    ignoreReadonlyClassProperties: true,
                },
            ],
            '@typescript-eslint/array-type': ['error', { default: 'array' }],
            '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
            '@typescript-eslint/explicit-function-return-type': ['error', {
                allowExpressions: true,
                allowTypedFunctionExpressions: true
            }],
            '@typescript-eslint/no-explicit-any': ['error', { fixToUnknown: true }],
            '@typescript-eslint/no-inferrable-types': [
                'error',
                { ignoreParameters: true, ignoreProperties: true },
            ],
            '@typescript-eslint/prefer-for-of': 'error',
            '@typescript-eslint/prefer-function-type': 'error',
            "@typescript-eslint/consistent-type-assertions": "error",
            "@typescript-eslint/no-empty-function": "error",
            "@typescript-eslint/no-misused-new": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-shadow": ["error", { "hoist": "all" }],
            "@typescript-eslint/no-require-imports": "error",
            "@typescript-eslint/no-empty-object-type": "error",
            "@typescript-eslint/no-unsafe-function-type": "error",
            "@typescript-eslint/no-wrapper-object-types": "error",
            "@typescript-eslint/naming-convention": [
                "error",
                {
                    "format": ["camelCase"],
                    "leadingUnderscore": "allow",
                    "selector": "default",
                    "trailingUnderscore": "allow",
                    "filter": { "regex": "^(_id|__v)$", "match": false }
                },
                {
                    "format": ["camelCase", "UPPER_CASE"],
                    "selector": "variable",
                    "trailingUnderscore": "allow",
                },
                {
                    "format": ["camelCase", "UPPER_CASE"],
                    "selector": "classProperty",
                    "modifiers": ["readonly"]
                },
                {
                    "format": ["PascalCase"],
                    "selector": "typeLike"
                },
                {
                    "format": ["PascalCase"],
                    "selector": "enum"
                },
                {
                    "format": ["PascalCase"],
                    "selector": "enumMember"
                }
            ],
            "no-restricted-syntax": ["error", ...sharedRestrictedSyntax]
        },
    },
    {
        files: ['**/*.component.ts', '**/*.service.ts', '**/*.controller.ts'],
        rules: {
            'no-restricted-syntax': ['error', ...sharedRestrictedSyntax, {
                selector: 'ExportNamedDeclaration > TSEnumDeclaration',
                message: 'Do not export enums from component, service or controller files. Move them to a dedicated file.',
            },
                {
                    selector: 'ExportNamedDeclaration > TSInterfaceDeclaration',
                    message: 'Do not export interfaces from component, service or controller files. Move them to a dedicated file.',
                },
                {
                    selector: 'ExportNamedDeclaration > TSTypeAliasDeclaration',
                    message: 'Do not export type aliases from component, service or controller files. Move them to a dedicated file.',
                },
                {
                    selector: 'ExportNamedDeclaration > VariableDeclaration',
                    message: 'Do not export constants or variables from component, service or controller files. Move them to a dedicated file.',
                },
                {
                    selector: 'ExportNamedDeclaration[declaration=null]',
                    message: 'Do not re-export symbols from component, service or controller files. Only the class itself should be exported.',
                },
                {
                    selector: 'ExportDefaultDeclaration',
                    message: 'Do not use default exports. Export the class by name instead.',
                },],
        },
    },
    {
        files: ['**/*.spec.ts', '**/*.fixture.ts'],
        rules: {
            // Fixture values and explicit state mutations make test scenarios readable.
            '@typescript-eslint/no-magic-numbers': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'no-param-reassign': 'off',
            '@typescript-eslint/dot-notation': 'off',
            'max-lines-per-function': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
        },
    },
];

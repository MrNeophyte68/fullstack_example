import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import templateParser from '@angular-eslint/template-parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import baseConfig from '../eslint.config.basic.mjs';

export default [
    ...baseConfig(tsParser, tsPlugin),
    {
        files: ['**/*.ts'],
        plugins: {
            '@angular-eslint': angular,
        },
        rules: {
            // Angular rules
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],
            '@angular-eslint/use-lifecycle-interface': 'error',
            '@angular-eslint/no-input-rename': 'error',
        },
    },
    {
        // Analyse des gabarits en ligne dans les fichiers TS
        files: ['**/*.ts'],
        processor: angularTemplate.processors['extract-inline-html'],
    },
    {
        files: ['**/*.html'],
        languageOptions: {
            parser: templateParser,
        },
        plugins: {
            '@angular-eslint/template': angularTemplate,
        },
        rules: {
            '@angular-eslint/template/banana-in-box': 'error',
            '@angular-eslint/template/eqeqeq': 'error',
            '@angular-eslint/template/no-negated-async': 'error',
            '@angular-eslint/template/no-duplicate-attributes': 'error',
            '@angular-eslint/template/no-any': 'error',
            '@angular-eslint/template/no-nested-tags': 'error',
            '@angular-eslint/template/prefer-control-flow': 'error',

            '@angular-eslint/template/no-inline-styles': ['error', { allowNgStyle: true, allowBindToStyle: true }],
            '@angular-eslint/template/conditional-complexity': ['error', { maxComplexity: 5 }],
            '@angular-eslint/template/cyclomatic-complexity': ['error', { maxComplexity: 10 }],
        },
    },
];

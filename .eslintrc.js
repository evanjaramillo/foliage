module.exports = {
    extends: [
        'eslint:recommended',
        '@electron-toolkit/eslint-config-ts/recommended',
        '@electron-toolkit/eslint-config-prettier',
    ],
    overrides: [
        {
            files: ['**/*.ts', '**/*.js'],
            rules: {
                'prettier/prettier': [
                    'error',
                    {
                        trailingComma: 'all',
                        tabWidth: 4,
                        semi: true,
                        singleQuote: true,
                        bracketSpacing: true,
                        eslintIntegration: true,
                        printWidth: 80,
                    },
                ],
            },
        },
    ],
};

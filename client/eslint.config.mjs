import js from '@eslint/js';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		files: ['src/**/*.{js,jsx}'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			react,
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
		rules: {
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
		},
	},
];

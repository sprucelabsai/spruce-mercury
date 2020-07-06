import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
// import json from '@rollup/plugin-json'
import replace from 'rollup-plugin-replace'
import typescript from '@rollup/plugin-typescript'
import builtins from 'rollup-plugin-node-builtins'
import globals from 'rollup-plugin-node-globals'

export default {
	// input: 'build/index.js',
	input: 'index.ts',
	output: {
		file: 'build/umd/mercury.js',
		format: 'umd',
		name: 'mercury',
		sourcemap: true
	},
	external: ['fs', 'http', 'https', 'child_process'],
	plugins: [
		replace({
			include: ['node_modules/uuid/**'],
			delimiters: ['', ''],
			values: {
				'crypto.randomBytes': "require('randombytes')"
			}
		}),
		typescript({
			tsconfig: './tsconfig.browser.json'
		}),
		resolve({
			browser: true
			// preferBuiltins: false
		}),
		commonjs({ extensions: ['.js', '.ts'] }),
		globals(),
		builtins()
		// json()
	]
}

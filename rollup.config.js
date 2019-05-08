// rollup.config.js
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default [
  {
    input: 'src/client.js',
    output: {
      file: 'lib/client.js',
      format: 'cjs'
    },
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      })
    ]
  },
  {
    input: 'src/client.js',
    output: {
      file: 'es/client.js',
      format: 'es'
    },
    plugins: [
      resolve(),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      })
    ]
  }
];

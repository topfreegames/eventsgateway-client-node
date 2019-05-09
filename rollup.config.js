// rollup.config.js
import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import { terser } from 'rollup-plugin-terser'

export default [
  // CommonJS
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
  // ES
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
  },
  // UMD Development
  {
    input: 'src/client.js',
    output: {
      file: 'dist/client.js',
      format: 'umd',
      name: 'EventsGateway Client',
      indent: false
    },
    plugins: [
      resolve({
        mainFields: ['module', 'main']
      }),
      babel({
        exclude: 'node_modules/**'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('development')
      })
    ]
  },

  // UMD Production
  {
    input: 'src/client.js',
    output: {
      file: 'dist/client.min.js',
      format: 'umd',
      name: 'EventsGateway Client',
      indent: false
    },
    plugins: [
      resolve({
        mainFields: ['module', 'main']
      }),
      babel({
        exclude: 'node_modules/**'
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      terser({
        compress: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      })
    ]
}
]

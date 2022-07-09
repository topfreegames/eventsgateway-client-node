// rollup.config.js
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import copy from 'rollup-plugin-copy'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import pkg from './package.json'

export default [
  // CommonJS
  {
    input: 'src/client.js',
    output: {
      file: 'lib/client.js',
      format: 'cjs',
    },
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      resolve(),
      json(),
      commonjs({ extensions: ['.js', '.json'] }),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      }),
      copy({
        targets: [{src: 'src/producer/protos', dest: 'lib'}]
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
    external: [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    ],
    plugins: [
      resolve(),
      json(),
      commonjs({ extensions: ['.js', '.json'] }),
      babel({
        exclude: 'node_modules/**' // only transpile our source code
      }),
      copy({
        targets: [{src: 'src/producer/protos', dest: 'es'}]
      })
    ]
  },
  // // UMD Development
  // {
  //   input: 'src/client.js',
  //   output: {
  //     file: 'dist/client.js',
  //     format: 'umd',
  //     name: 'EventsGateway Client',
  //     indent: false
  //   },
  //   plugins: [
  //     resolve({
  //       mainFields: ['module', 'main']
  //     }),
  //     json(),
  //     commonjs({ extensions: ['.js', '.json'] }),
  //     babel({
  //       exclude: 'node_modules/**'
  //     }),
  //     replace({
  //       'process.env.NODE_ENV': JSON.stringify('development')
  //     })
  //   ]
  // },

  // // UMD Production
  // {
  //   input: 'src/client.js',
  //   output: {
  //     file: 'dist/client.min.js',
  //     format: 'umd',
  //     name: 'EventsGateway Client',
  //     indent: false
  //   },
  //   plugins: [
  //     resolve({
  //       mainFields: ['module', 'main']
  //     }),
  //     babel({
  //       exclude: 'node_modules/**'
  //     }),
  //     json(),
  //     commonjs({ extensions: ['.js', '.json'] }),
  //     replace({
  //       'process.env.NODE_ENV': JSON.stringify('production')
  //     }),
  //     terser({
  //       compress: {
  //         pure_getters: true,
  //         unsafe: true,
  //         unsafe_comps: true,
  //         warnings: false
  //       }
  //     })
  //   ]
  // }
]

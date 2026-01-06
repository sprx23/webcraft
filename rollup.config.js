import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: {
    main: 'src/main.ts',
    chunkio: 'src/workers/chunkio/worker.ts',
    gamelogic: 'src/workers/backend/worker.ts'
  },
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: false,
    entryFileNames: '[name].js'
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript()
  ]
};

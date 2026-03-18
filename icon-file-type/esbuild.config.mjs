import esbuild from 'esbuild';
import process from 'process';
import { copyFileSync } from 'fs';

const prod = process.argv[2] === 'production';
const outDir = '.';


const ctx = await esbuild.context({
  entryPoints: ['main.ts'],
  bundle: true,
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: `${outDir}/main.js`,
  loader: { '.png': 'dataurl' },
});

copyFileSync('manifest.json', `${outDir}/manifest.json`);
copyFileSync('styles.css', `${outDir}/styles.css`);

if (prod) {
  await ctx.rebuild();
  await ctx.dispose();
  process.exit(0);
} else {
  await ctx.watch();
}

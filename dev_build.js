import esbuild from "esbuild";
import path from 'path';

const version = "1.0"

function inlineWorkerPlugin(extraConfig = {}) {
	return {
		name: 'esbuild-plugin-inline-worker',
		setup(build) {
			build.onLoad(
				{ filter: /\.worker\.(js|jsx|ts|tsx)$/ },
				async ({ path: workerPath }) => {
					let { workerCode, watchFiles } = await buildWorker(workerPath, extraConfig);
					return {
						contents: `import inlineWorker from '__inline-worker'
export default function Worker() {
  return inlineWorker(${JSON.stringify(workerCode)});
}
`,
						loader: 'js',
						watchFiles,
					};
				}
			);
			build.onResolve({ filter: /^__inline-worker$/ }, ({ path }) => {
				return { path, namespace: 'inline-worker' };
			});
			build.onLoad({ filter: /.*/, namespace: 'inline-worker' }, () => {
				return { contents: inlineWorkerFunctionCode, loader: 'js' };
			});
		},
	};
}
const inlineWorkerFunctionCode = `
export default function inlineWorker(scriptText) {
  let blob = new Blob([scriptText], {type: 'text/javascript'});
  let url = URL.createObjectURL(blob);
  let worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}
`;
async function buildWorker(workerPath, extraConfig) {
	if (extraConfig) {
		delete extraConfig.entryPoints;
		delete extraConfig.outfile;
		delete extraConfig.outdir;
	}
	const result = await esbuild.build({
		entryPoints: [workerPath],
		bundle: true,
		minify: true,
		sourcemap: false,
		format: 'iife',
		platform: 'browser',
		...extraConfig,
		write: false,
		metafile: true
	});
	const workerCode = result.outputFiles[0].text;
	const watchFiles = Object.keys(result.metafile.inputs).map(relPath => path.resolve(relPath));
	return { workerCode, watchFiles };
}

const isProd = false; // just set this true for building

const common_define = {
	__BUILD_TIME__: "__BUILD_TIME__",
	__BUILD_ID__: "__BUILD_ID__",
	__VERSION__: version
}
const options = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	outfile: "dist/bundle.js",
	format: "iife",
	platform: "browser",
	minify: true,
	sourcemap: false,
	define: common_define,
	plugins: [inlineWorkerPlugin({ define: common_define })], // enables worker rebuilds
};

if (isProd) {
	await esbuild.build(options);
} else {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log("Watching...");
}

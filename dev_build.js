import esbuild from "esbuild";
import inlineWorker from "esbuild-plugin-inline-worker";

const isProd = false; // just set this true for building
const options = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	outfile: "dist/bundle.js",
	format: "iife",
	platform: "browser",
	minify: true,
	sourcemap: false,
	plugins: [inlineWorker()], // enables worker rebuilds
};

if (isProd) {
	await esbuild.build(options);
} else {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log("Watching...");
}

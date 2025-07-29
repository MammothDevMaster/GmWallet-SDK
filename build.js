import esbuild from "esbuild";

const isDev = process.argv.includes('--dev');

const baseConfig = {
    entryPoints: ["src/index.ts"],
    outdir: "dist",
    bundle: true,
    loader: {
        ".gif": "dataurl",
        ".png": "dataurl",
        ".svg": "dataurl",
    },
    sourcemap: true,
    define: {
        "__DEV__": isDev ? "true" : "false",
    },
};
Promise.all([
    esbuild.build({
        ...baseConfig,
        format: "cjs",
        outExtension: {
            ".js": ".cjs",
        },
    }),
    esbuild.build({
        ...baseConfig,
        format: "esm",
    }),
]).catch(() => {
    console.log("Build failed");
    process.exit(1);
});

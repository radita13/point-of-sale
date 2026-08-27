import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "api/index.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: false,
  splitting: false,
  dts: false,
});

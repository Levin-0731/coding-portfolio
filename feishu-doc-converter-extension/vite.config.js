import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isQuickBuild = mode === "development";

  return {
    plugins: [vue()],
    base: "./",
    build: {
      outDir: "dist",
      minify: isQuickBuild ? false : "terser",
      terserOptions: isQuickBuild
        ? undefined
        : {
            compress: {
              drop_console: isQuickBuild ? false : true,
              drop_debugger: true,
            },
          },
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          background: resolve(__dirname, "public/background.js"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          assetFileNames: "[name].[ext]",
        },
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    server: {
      port: 3001,
      proxy: {
        "/api": {
          target: "https://open.feishu.cn/open-apis",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});

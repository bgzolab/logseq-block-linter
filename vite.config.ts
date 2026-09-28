import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

/**
 * 构建时往 dist/ 里写一份 package.json 和图标。
 *
 * Logseq 加载插件时会读取「所选文件夹」里的 package.json，
 * 所以 dist/ 只有 index.html 的话会报 Illegal Logseq plugin package。
 * 有了这个插件，加载仓库根目录和加载 dist/ 都能正常工作。
 */
function distPluginManifest(): Plugin {
  return {
    name: 'logseq-dist-plugin-manifest',
    apply: 'build',
    generateBundle() {
      const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

      this.emitFile({
        type: 'asset',
        fileName: 'package.json',
        source: `${JSON.stringify(
          {
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            license: pkg.license,
            // 相对 dist/ 本身
            main: 'index.html',
            logseq: pkg.logseq,
          },
          null,
          2
        )}\n`,
      })

      this.emitFile({
        type: 'asset',
        fileName: 'logo.svg',
        source: readFileSync(new URL('./logo.svg', import.meta.url)),
      })
    },
  }
}

export default defineConfig({
  // Logseq 以 file:// 加载插件，产物必须使用相对路径
  base: './',
  plugins: [distPluginManifest()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
    // 插件体量很小，保留可读的产物方便排查问题
    minify: false,
  },
})

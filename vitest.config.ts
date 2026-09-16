import { defineConfig, Plugin } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

function angularComponentPlugin(): Plugin {
  return {
    name: 'angular-component-plugin',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.ts') || !code.includes('@Component')) {
        return null;
      }

      const dir = path.dirname(id);

      // Inline templateUrl
      let transformed = code.replace(/templateUrl\s*:\s*['"]([^'"]+)['"]/g, (_, templatePath) => {
        const fullPath = path.resolve(dir, templatePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          return `template: ${JSON.stringify(content)}`;
        }
        return `template: ""`;
      });

      // Replace styleUrl with styles: []
      transformed = transformed.replace(/styleUrl\s*:\s*['"]([^'"]+)['"]/g, 'styles: []');

      // Replace styleUrls with styles: []
      transformed = transformed.replace(/styleUrls\s*:\s*\[[^\]]*\]/g, 'styles: []');

      // Extract signal inputs & outputs
      const propMeta: Record<string, any[]> = {};

      const inputMatches = transformed.matchAll(
        /(?:public\s+|private\s+|readonly\s+)?([a-zA-Z0-9_$]+)\s*=\s*(?:input|model)(?:\.required)?\s*<[^(]*\(|(?:public\s+|private\s+|readonly\s+)?([a-zA-Z0-9_$]+)\s*=\s*(?:input|model)(?:\.required)?\s*\(/g
      );
      for (const m of inputMatches) {
        const prop = m[1] || m[2];
        if (prop) {
          propMeta[prop] = [{ ngMetadataName: 'Input', isSignal: true, alias: prop }];
        }
      }

      const outputMatches = transformed.matchAll(
        /(?:public\s+|private\s+|readonly\s+)?([a-zA-Z0-9_$]+)\s*=\s*output(?:\.required)?\s*<[^(]*\(|(?:public\s+|private\s+|readonly\s+)?([a-zA-Z0-9_$]+)\s*=\s*output(?:\.required)?\s*\(/g
      );
      for (const m of outputMatches) {
        const prop = m[1] || m[2];
        if (prop) {
          propMeta[prop] = [{ ngMetadataName: 'Output', alias: prop }];
        }
      }

      const classMatches = transformed.matchAll(/export\s+class\s+([a-zA-Z0-9_$]+)\b/g);
      const propMetadataInjections: string[] = [];

      for (const classMatch of classMatches) {
        const className = classMatch[1];
        if (Object.keys(propMeta).length > 0) {
          propMetadataInjections.push(
            `if (typeof ${className} !== 'undefined') { ${className}.propMetadata = Object.assign({}, ${className}.propMetadata, ${JSON.stringify(propMeta)}); }`
          );
        }
      }

      if (propMetadataInjections.length > 0) {
        transformed += '\n' + propMetadataInjections.join('\n') + '\n';
      }

      return {
        code: transformed,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [angularComponentPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/app', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
  },
});

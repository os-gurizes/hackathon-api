import { readFile, writeFile } from 'node:fs/promises'

const files = ['src/db/analytics/schema.ts', 'src/db/analytics/relations.ts']

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const cleaned = source
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n')
    .replaceAll(/(\w+)InAnalytics\b/g, '$1')
    .replaceAll(`from "./schema"`, `from "./schema.js"`)
    .replaceAll(/\n{3,}/g, '\n\n')
  await writeFile(file, cleaned)
}

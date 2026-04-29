import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

async function updateJson(path, newVersion) {
  const content = await readFile(path, 'utf8')
  const json = JSON.parse(content)
  json.version = newVersion
  await writeFile(path, JSON.stringify(json, null, 2) + '\n')
}

async function main() {
  const newVersion = process.argv[2]
  if (!newVersion) {
    console.error('Usage: node scripts/sync-versions.mjs <version>')
    process.exit(1)
  }

  const packagePath = resolve(process.cwd(), 'package.json')
  const manifestPath = resolve(process.cwd(), 'public/manifest.json')

  await updateJson(packagePath, newVersion)
  await updateJson(manifestPath, newVersion)
  
  console.log(`Successfully synced files to version ${newVersion}`)
}

main().catch(console.error)

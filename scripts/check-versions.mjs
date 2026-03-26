import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function assertSemver(version, label) {
  const semverRegex = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
  if (!semverRegex.test(version)) {
    throw new Error(`${label} version "${version}" is not valid semver.`)
  }
}

async function readJson(filePath) {
  const content = await readFile(filePath, 'utf8')
  return JSON.parse(content)
}

async function main() {
  const packagePath = resolve(process.cwd(), 'package.json')
  const manifestPath = resolve(process.cwd(), 'public/manifest.json')

  const pkg = await readJson(packagePath)
  const manifest = await readJson(manifestPath)

  const packageVersion = pkg.version
  const manifestVersion = manifest.version

  if (typeof packageVersion !== 'string' || typeof manifestVersion !== 'string') {
    throw new Error('Missing version in package.json or public/manifest.json.')
  }

  assertSemver(packageVersion, 'package.json')
  assertSemver(manifestVersion, 'manifest.json')

  if (packageVersion !== manifestVersion) {
    throw new Error(
      `Version mismatch: package.json=${packageVersion} and public/manifest.json=${manifestVersion}.`
    )
  }

  console.log(`Version check passed: ${packageVersion}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

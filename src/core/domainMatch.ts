export function extractHostname(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname + (parsed.port ? ':' + parsed.port : '')
  } catch {
    return ''
  }
}

export function matchesDomain(pattern: string, hostname: string): boolean {
  if (!pattern || !hostname) return false

  const normalizedPattern = pattern.toLowerCase().trim()
  const normalizedHost = hostname.toLowerCase().trim()

  if (normalizedPattern === normalizedHost) return true

  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2)
    return (
      normalizedHost === suffix ||
      normalizedHost.endsWith('.' + suffix)
    )
  }

  return false
}

export function findMatchingPatterns(
  patterns: string[],
  currentUrl: string
): boolean {
  const hostname = extractHostname(currentUrl)
  if (!hostname) return false
  return patterns.some((p) => matchesDomain(p, hostname))
}

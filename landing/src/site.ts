import { isRepo } from './release'

/** Site-wide facts. Each lives here once. */
export const REPOSITORY: string | null = isRepo(__GITHUB_REPOSITORY__) ? __GITHUB_REPOSITORY__ : null
export const REPOSITORY_URL = REPOSITORY ? `https://github.com/${REPOSITORY}` : null

// The licence note shown in the footer lives in i18n.ts (footer.license): no
// license has been chosen yet and the repository has no LICENSE file.

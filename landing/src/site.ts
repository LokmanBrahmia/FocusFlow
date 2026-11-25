import { isRepo } from './release'

/** Site-wide facts. Each lives here once. */
export const REPOSITORY: string | null = isRepo(__GITHUB_REPOSITORY__) ? __GITHUB_REPOSITORY__ : null
export const REPOSITORY_URL = REPOSITORY ? `https://github.com/${REPOSITORY}` : null

/**
 * No license has been chosen for Azm yet (the repository has no
 * LICENSE file). Update this once one is added.
 */
export const LICENSE_NOTE = 'License not chosen yet'

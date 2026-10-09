// Site-relative links. Clean directory URLs by default ("app/"); hosts that do not
// serve directory indexes (e.g. the artifact preview) build with
// VITE_EXPLICIT_INDEX=1 to get "app/index.html".
const explicitIndex = import.meta.env.VITE_EXPLICIT_INDEX === '1'

/** `root` is the relative path from the current page to the site root, e.g. '../../'. */
export function siteLink(root, path = '') {
  const target = `${root}${path}`
  if (!explicitIndex) return target || './'
  return target.endsWith('/') || target === '' ? `${target}index.html` : target
}

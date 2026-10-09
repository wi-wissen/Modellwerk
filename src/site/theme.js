// Theme preference shared by all pages: 'system' | 'light' | 'dark'.
export const THEMES = ['system', 'light', 'dark']

export function loadTheme() {
  try {
    return JSON.parse(localStorage.getItem('modellwerk.theme')) ?? 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem('modellwerk.theme', JSON.stringify(theme))
  } catch {
    // storage unavailable; the choice lasts for this page view
  }
}

export const nextTheme = (theme) => THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]

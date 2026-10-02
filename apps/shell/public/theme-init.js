;(function () {
  try {
    var t = localStorage.getItem('alltools:theme') || localStorage.getItem('all_theme') || 'dark'
    document.documentElement.setAttribute('data-theme', t)
    document.documentElement.setAttribute('data-all-theme', t)
    var isLight = t === 'light' || t === 'e-ink-light'
    var bg = isLight ? '#f2f1ec' : '#0a0a0a'
    var fg = isLight ? '#111111' : '#efefef'
    document.documentElement.style.backgroundColor = bg
    document.documentElement.style.color = fg
    if (t.indexOf('e-ink') !== -1) {
      document.documentElement.setAttribute('data-eink', 'true')
    }
  } catch (e) {}
})()

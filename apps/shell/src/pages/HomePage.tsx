import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TOOLS_METADATA } from '../tools/registry'
import { ToolCard } from '../components/ToolCard'
import { useI18n } from '../i18n'
import { getLocalizedTags } from '../types/tool'

const heroVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const lineVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

export function HomePage() {
  const { locale, t } = useI18n()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Extract all unique tags in current locale, sorted descending by tool count
  const allTags = useMemo(() => {
    const tagCountMap = new Map<string, number>()
    TOOLS_METADATA.forEach(tool => {
      const tags = getLocalizedTags(tool.tags, locale)
      const uniqueToolTags = new Set(tags.map(tg => tg.trim().toLowerCase()))
      uniqueToolTags.forEach(tg => {
        tagCountMap.set(tg, (tagCountMap.get(tg) || 0) + 1)
      })
    })

    return Array.from(tagCountMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag)
  }, [locale])

  // Filter tools based on selected tag
  const filteredTools = useMemo(() => {
    if (!selectedTag) return TOOLS_METADATA
    const normalizedSelected = selectedTag.trim().toLowerCase()
    return TOOLS_METADATA.filter(tool => {
      const tags = getLocalizedTags(tool.tags, locale).map(tg => tg.trim().toLowerCase())
      return tags.includes(normalizedSelected)
    })
  }, [selectedTag, locale])

  return (
    <div className="home-page">
      <div className="container">
        {/* Hero Section */}
        <motion.section
          className="home-hero"
          variants={heroVariants}
          initial="hidden"
          animate="visible"
          aria-labelledby="home-title"
        >
          <motion.p className="home-eyebrow" variants={lineVariants}>
            {t.heroEyebrow}
          </motion.p>
          <motion.h1 className="home-title" id="home-title" variants={lineVariants}>
            All<br />Tools
          </motion.h1>
          <motion.p className="home-description" variants={lineVariants}>
            {t.heroDescription}
          </motion.p>
        </motion.section>

        {/* Filter Bar & Tools List */}
        <section aria-labelledby="tools-section-label">
          <div className="home-section-header">
            <motion.p
              className="home-tools-label"
              id="tools-section-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {t.toolCount(filteredTools.length)}
            </motion.p>

            {/* Filter chips */}
            {allTags.length > 0 && (
              <motion.div
                className="home-filters"
                role="group"
                aria-label={t.filterLabel}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <button
                  type="button"
                  id="filter-all-btn"
                  className={`home-filter-chip ${selectedTag === null ? 'home-filter-chip--active' : ''}`}
                  onClick={() => setSelectedTag(null)}
                >
                  {selectedTag === null && (
                    <motion.span
                      className="home-filter-indicator"
                      layoutId="activeFilterIndicator"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="home-filter-text">{t.allFilter}</span>
                  <span className="home-filter-count">{TOOLS_METADATA.length}</span>
                </button>

                {allTags.map(tag => {
                  const isSelected = selectedTag === tag
                  const count = TOOLS_METADATA.filter(tool =>
                    getLocalizedTags(tool.tags, locale).some(tg => tg.trim().toLowerCase() === tag)
                  ).length

                  return (
                    <button
                      key={tag}
                      type="button"
                      id={`filter-tag-${tag.replace(/\s+/g, '-').toLowerCase()}`}
                      className={`home-filter-chip ${isSelected ? 'home-filter-chip--active' : ''}`}
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                    >
                      {isSelected && (
                        <motion.span
                          className="home-filter-indicator"
                          layoutId="activeFilterIndicator"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span className="home-filter-text">{tag}</span>
                      <span className="home-filter-count">{count}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </div>

          {/* Animated Tools Grid */}
          <motion.div className="tools-grid" role="list" layout>
            <AnimatePresence mode="popLayout">
              {filteredTools.length > 0 ? (
                filteredTools.map((tool, i) => (
                  <motion.div
                    key={tool.slug}
                    role="listitem"
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ToolCard metadata={tool} index={i} />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="home-no-tools"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  <p>{t.noFilteredTools}</p>
                  <button
                    type="button"
                    className="home-filter-reset-btn"
                    onClick={() => setSelectedTag(null)}
                  >
                    {t.clearFilter}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </div>
  )
}

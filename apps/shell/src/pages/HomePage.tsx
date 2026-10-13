import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AppFooter,
  DirectoryHero,
  CatalogSectionHeader,
  CatalogGrid,
  FilterGroup,
  useCardScrollRestoration,
  isReturningFromCard,
  useMotion,
} from '@all/ui'
import { TOOLS_METADATA } from '../tools/registry'
import { ToolCard } from '../components/ToolCard'
import { useI18n } from '../i18n'
import { getLocalizedTags, getLocalizedText } from '../types/tool'

export function HomePage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const { isMotionEnabled } = useMotion()
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Extract all unique tags in current locale, sorted descending by tool count
  const allTags = useMemo(() => {
    const tagCountMap = new Map<string, number>()
    TOOLS_METADATA.forEach((tool) => {
      const tags = getLocalizedTags(tool.tags, locale)
      const uniqueToolTags = new Set(tags.map((tg) => tg.trim().toLowerCase()))
      uniqueToolTags.forEach((tg) => {
        tagCountMap.set(tg, (tagCountMap.get(tg) || 0) + 1)
      })
    })

    return Array.from(tagCountMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag)
  }, [locale])

  // Filter and sort tools alphabetically based on localized name
  const filteredTools = useMemo(() => {
    const list = !selectedTag
      ? [...TOOLS_METADATA]
      : TOOLS_METADATA.filter((tool) => {
          const tags = getLocalizedTags(tool.tags, locale).map((tg) => tg.trim().toLowerCase())
          return tags.includes(selectedTag.trim().toLowerCase())
        })

    return list.sort((a, b) => {
      const nameA = getLocalizedText(a.name, locale)
      const nameB = getLocalizedText(b.name, locale)
      return nameA.localeCompare(nameB, locale, { sensitivity: 'base' })
    })
  }, [selectedTag, locale])

  // Capture whether we are returning from a tool via Back button on mount
  const isReturning = useRef(isReturningFromCard()).current

  // Restore scroll position to the last active tool card when returning from a tool
  useCardScrollRestoration({ dependencies: [filteredTools.length] })

  return (
    <div className="home-page">
      <div className="container">
        {/* Hero Section */}
        <DirectoryHero
          title={
            <>
              All
              <br />
              Tools
            </>
          }
          eyebrow={t.heroEyebrow}
          description={t.heroDescription}
          isReturning={isReturning}
        />

        {/* Filter Bar & Tools List */}
        <section aria-labelledby="tools-section-label">
          <CatalogSectionHeader
            label={t.toolCount(filteredTools.length)}
            labelId="tools-section-label"
            filters={
              <>
                {/* Shared category filters */}
                {allTags.length > 0 && (
                  <FilterGroup<string | null>
                    label={t.filterLabel}
                    value={selectedTag}
                    onChange={(tag) => setSelectedTag(tag === selectedTag ? null : tag)}
                    options={[
                      {
                        id: 'all',
                        value: null,
                        label: t.allFilter,
                        count: TOOLS_METADATA.length,
                        buttonId: 'filter-all-btn',
                      },
                      ...allTags.map((tag) => ({
                        id: tag,
                        value: tag,
                        label: tag,
                        count: TOOLS_METADATA.filter((g) =>
                          getLocalizedTags(g.tags, locale).some((t) => t.trim().toLowerCase() === tag),
                        ).length,
                        buttonId: `filter-tag-${tag.replace(/\s+/g, '-').toLowerCase()}`,
                      })),
                    ]}
                  />
                )}
              </>
            }
          />

          {/* Animated Tools Grid */}
          <CatalogGrid className="tools-grid">
            <AnimatePresence mode="popLayout">
              {filteredTools.length > 0 ? (
                filteredTools.map((tool, i) => (
                  <motion.div
                    key={tool.slug}
                    role="listitem"
                    layout={isMotionEnabled}
                    initial={
                      isMotionEnabled ? (isReturning ? { opacity: 0, y: 8 } : { opacity: 0, scale: 0.95 }) : false
                    }
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={isMotionEnabled ? { opacity: 0, scale: 0.95 } : undefined}
                    transition={
                      isMotionEnabled
                        ? { duration: isReturning ? 0.2 : 0.35, ease: [0.16, 1, 0.3, 1] }
                        : { duration: 0 }
                    }
                  >
                    <ToolCard metadata={tool} index={i} isReturning={isReturning} />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="home-no-tools"
                  initial={isMotionEnabled ? { opacity: 0, y: 16 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={isMotionEnabled ? { opacity: 0, y: -16 } : undefined}
                  transition={{ duration: 0.3 }}
                >
                  <p>{t.noFilteredTools}</p>
                  <button type="button" className="home-filter-reset-btn" onClick={() => setSelectedTag(null)}>
                    {t.clearFilter}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </CatalogGrid>
        </section>

        {/* Footer */}
        <AppFooter
          legalLabel={t.legalNotice}
          onLegalClick={() => navigate('/legal')}
          copyright="AllTools © 2026. Free & Open Source."
          links={[
            {
              label: 'AllGames',
              href: 'https://patrasxd.github.io/AllGames/',
              external: true,
            },
            {
              label: 'AllLinks',
              href: 'https://patrasxd.github.io/AllLinks/',
              external: true,
            },
            {
              label: 'GitHub',
              href: 'https://github.com/patrasxd',
              external: true,
            },
            {
              label: 'LinkedIn',
              href: 'https://www.linkedin.com/in/patryk-popio%C5%82ek-615048201/',
              external: true,
            },
          ]}
        />
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n'
import { getLocalizedText, getLocalizedTags } from '../types/tool'
import type { ToolMetadata } from '../types/tool'
import { Badge } from '@alltools/ui'

interface ToolCardProps {
  metadata: ToolMetadata
  index: number
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
}

export function ToolCard({ metadata, index }: ToolCardProps) {
  const navigate = useNavigate()
  const { locale, t } = useI18n()

  const name = getLocalizedText(metadata.name, locale)
  const description = getLocalizedText(metadata.description, locale)
  const tags = getLocalizedTags(metadata.tags, locale)
  const visibleTags = tags.slice(0, 4)

  const handleClick = () => navigate(`/tools/${metadata.slug}`)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <motion.article
      className="tool-card"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={t.openAria(name)}
      id={`tool-card-${metadata.slug}`}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {/*
        Animated sketch border: SVG rect with stroke-dashoffset animation.
        viewBox="0 0 300 220" matches the rendered card proportions.
        Perimeter = 2*(298+218) = 1032 — used as stroke-dasharray.
      */}
      <svg
        className="tool-card-sketch-border"
        viewBox="0 0 300 220"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="298" height="218" rx="3" />
      </svg>

      <div>
        <span className="tool-card-icon" aria-hidden="true">
          {metadata.icon}
        </span>
        <h2 className="tool-card-name">{name}</h2>
        <p className="tool-card-description">{description}</p>
      </div>

      <div className="tool-card-footer">
        <div className="tool-card-tags" aria-label={t.toolTagsAria}>
          {visibleTags.map(tag => (
            <Badge key={tag} size="sm">{tag}</Badge>
          ))}
        </div>
        <span className="tool-card-play" aria-hidden="true">
          {t.open}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 6h8M6 2l4 4-4 4" />
          </svg>
        </span>
      </div>
    </motion.article>
  )
}

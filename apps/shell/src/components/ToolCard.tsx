import { useNavigate } from 'react-router-dom'
import { CatalogCard, setLastActiveCardId } from '@all/ui'
import { useI18n } from '../i18n'
import { getLocalizedText, getLocalizedTags } from '../types/tool'
import type { ToolMetadata } from '../types/tool'

export function ToolCard({
  metadata,
  index,
  isReturning,
}: {
  metadata: ToolMetadata
  index: number
  isReturning?: boolean
}) {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const name = getLocalizedText(metadata.name, locale)
  return (
    <CatalogCard
      id={`tool-card-${metadata.slug}`}
      className="tool-card"
      title={name}
      description={getLocalizedText(metadata.description, locale)}
      icon={metadata.icon}
      tags={getLocalizedTags(metadata.tags, locale).slice(0, 4)}
      tagsLabel={t.toolTagsAria}
      actionLabel={t.open}
      ariaLabel={t.openAria(name)}
      clampDescription
      index={index}
      isReturning={isReturning}
      onActivate={() => {
        setLastActiveCardId(`tool-card-${metadata.slug}`)
        navigate(`/tools/${metadata.slug}`)
      }}
    />
  )
}

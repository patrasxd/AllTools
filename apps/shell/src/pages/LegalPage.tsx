import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LegalNotice, BackLink, DocumentPage } from '@all/ui'
import { useI18n } from '../i18n'

export function LegalPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()

  return (
    <div className="tool-page">
      <div className="tool-page-inner">
        <DocumentPage
          back={<BackLink label={t.backToTools} ariaLabel={t.backToToolsAria} onClick={() => navigate('/')} />}
        >
          {' '}
          <LegalNotice appName="AllTools" locale={locale} />{' '}
        </DocumentPage>
      </div>
    </div>
  )
}

export default LegalPage

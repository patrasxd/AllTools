import React from 'react'
import { Text } from '@all/ui'
import type { Problem } from '../types'
import type { getTranslations } from '../i18n'

interface ProblemsPanelProps {
  problems: Problem[]
  isPlainText: boolean
  t: ReturnType<typeof getTranslations>
  onSelect: (problem: Problem) => void
}

export function ProblemsPanel({ problems, isPlainText, t, onSelect }: ProblemsPanelProps) {
  return (
    <section className="cs-problems" aria-label={t.problemsTitle}>
      {isPlainText ? (
        <Text variant="dim">{t.noProblemsPlain}</Text>
      ) : problems.length === 0 ? (
        <Text variant="dim" role="status">
          {t.noProblems}
        </Text>
      ) : (
        <>
          <Text variant="caption" role="status" className="cs-problems__count">
            {t.problemsCount(problems.length)}
          </Text>
          <ul className="cs-problems__list">
            {problems.map((problem) => (
              <li key={`${problem.from}-${problem.to}`}>
                <button type="button" className="cs-problem" onClick={() => onSelect(problem)}>
                  <span className="cs-problem__pos">{t.problemAt(problem.line, problem.col)}</span>
                  <span className="cs-problem__msg">{problem.message}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Text variant="caption" className="cs-note">
        {t.lintNote}
      </Text>
    </section>
  )
}

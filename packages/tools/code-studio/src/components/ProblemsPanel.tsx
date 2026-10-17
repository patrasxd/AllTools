import React from 'react'
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
      <header className="cs-problems__header">
        <h2 className="cs-problems__title">{t.problemsTitle}</h2>
        {!isPlainText && problems.length > 0 && (
          <span className="cs-problems__count" role="status">
            {t.problemsCount(problems.length)}
          </span>
        )}
      </header>

      {isPlainText ? (
        <p className="cs-problems__empty">{t.noProblemsPlain}</p>
      ) : problems.length === 0 ? (
        <p className="cs-problems__empty" role="status">
          {t.noProblems}
        </p>
      ) : (
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
      )}

      <p className="cs-problems__note">{t.lintNote}</p>
    </section>
  )
}

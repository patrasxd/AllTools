import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BoardLayout,
  Card,
  Button,
  IconButton,
  Input,
  Select,
  PillGroup,
  ControlsBar,
  Dialog,
  CopyIcon,
  CheckIcon,
  RotateCcwIcon,
  TrashIcon,
} from '@all/ui'
import { ToolComponentProps, ToolMode, CalcMode, CalcHistoryItem, ScientificFn } from './types'
import { calcConverterTranslations } from './i18n'
import { safeEvaluate, evaluateScientific, formatCalcDisplay } from './utils/calcEngine'
import { UNIT_CATEGORIES, convertValue, convertRadix, formatFormattedValue } from './conversionData'
import './styles/calc-converter.css'

function BackspaceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <line x1="18" y1="9" x2="12" y2="15" />
      <line x1="12" y1="9" x2="18" y2="15" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 14 14" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function CalcConverter({ locale = 'en', setHeader, isEink = false }: ToolComponentProps) {
  const t = calcConverterTranslations[locale] || calcConverterTranslations.en
  const [activeMode, setActiveMode] = useState<ToolMode>('calc')

  // ─── Calculator State ───────────────────────────────────────
  const [calcMode, setCalcMode] = useState<CalcMode>('standard')
  const [expression, setExpression] = useState<string>('')
  const [displayVal, setDisplayVal] = useState<string>('0')
  const [activeOperator, setActiveOperator] = useState<string | null>(null)
  const [isNewNumber, setIsNewNumber] = useState<boolean>(true)
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false)
  const [history, setHistory] = useState<CalcHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('alltools:calc-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // ─── Converter State ────────────────────────────────────────
  const [selectedCatId, setSelectedCatId] = useState<string>('weight')
  const [convInput, setConvInput] = useState<string>('1')
  const [fromUnitId, setFromUnitId] = useState<string>('kg')
  const [toUnitId, setToUnitId] = useState<string>('lb')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Clear any redundant top-right header
  useEffect(() => {
    setHeader?.(null)
    return () => setHeader?.(null)
  }, [setHeader])

  const activeCategory = useMemo(() => {
    return UNIT_CATEGORIES.find((c) => c.id === selectedCatId) || UNIT_CATEGORIES[0]
  }, [selectedCatId])

  // Sync units when category changes
  useEffect(() => {
    const validUnits = activeCategory.units
    if (!validUnits.some((u) => u.id === fromUnitId)) {
      setFromUnitId(validUnits[0]?.id || activeCategory.baseUnit)
    }
    if (!validUnits.some((u) => u.id === toUnitId)) {
      setToUnitId(validUnits[1]?.id || validUnits[0]?.id || activeCategory.baseUnit)
    }
  }, [activeCategory, fromUnitId, toUnitId])

  // ─── Calculator Actions & History ────────────────────────────
  const saveToHistory = (expr: string, res: string) => {
    const item: CalcHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      expression: expr,
      result: res,
      timestamp: Date.now(),
    }
    const updated = [item, ...history.filter((h) => h.expression !== expr)].slice(0, 30)
    setHistory(updated)
    try {
      localStorage.setItem('alltools:calc-history', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem('alltools:calc-history')
    } catch {
      // ignore
    }
  }

  const handleInputDigit = useCallback((digit: string) => {
    if (isNewNumber || displayVal === '0' || displayVal === 'Error') {
      setDisplayVal(digit)
      setIsNewNumber(false)
    } else {
      if (displayVal.replace(/[^0-9]/g, '').length < 15) {
        setDisplayVal(displayVal + digit)
      }
    }
    setActiveOperator(null)
  }, [isNewNumber, displayVal])

  const handleInputDot = useCallback(() => {
    if (isNewNumber || displayVal === 'Error') {
      setDisplayVal('0.')
      setIsNewNumber(false)
    } else if (!displayVal.includes('.')) {
      setDisplayVal(displayVal + '.')
    }
    setActiveOperator(null)
  }, [isNewNumber, displayVal])

  const handleOperator = useCallback((op: string) => {
    setActiveOperator(op)
    if (expression && !isNewNumber) {
      try {
        const fullExpr = `${expression} ${displayVal}`
        const intermediate = safeEvaluate(fullExpr)
        const formatted = formatCalcDisplay(intermediate)
        setExpression(`${formatted} ${op}`)
        setDisplayVal(formatted)
      } catch {
        setExpression(`${displayVal} ${op}`)
      }
    } else {
      setExpression(`${displayVal} ${op}`)
    }
    setIsNewNumber(true)
  }, [expression, isNewNumber, displayVal])

  const handleEvaluate = useCallback(() => {
    if (!expression && isNewNumber) return
    const fullExpr = expression ? `${expression} ${displayVal}` : displayVal
    try {
      const result = safeEvaluate(fullExpr)
      const formatted = formatCalcDisplay(result)
      saveToHistory(fullExpr, formatted)
      setExpression('')
      setDisplayVal(formatted)
      setActiveOperator(null)
      setIsNewNumber(true)
    } catch {
      setDisplayVal('Error')
      setActiveOperator(null)
      setIsNewNumber(true)
    }
  }, [expression, isNewNumber, displayVal])

  const handleClear = useCallback(() => {
    setDisplayVal('0')
    setExpression('')
    setActiveOperator(null)
    setIsNewNumber(true)
  }, [])

  const handleBackspace = useCallback(() => {
    if (isNewNumber || displayVal === 'Error') return
    if (displayVal.length <= 1 || (displayVal.length === 2 && displayVal.startsWith('-'))) {
      setDisplayVal('0')
      setIsNewNumber(true)
    } else {
      setDisplayVal(displayVal.slice(0, -1))
    }
  }, [isNewNumber, displayVal])

  const handleToggleSign = useCallback(() => {
    if (displayVal === '0' || displayVal === 'Error') return
    if (displayVal.startsWith('-')) {
      setDisplayVal(displayVal.slice(1))
    } else {
      setDisplayVal('-' + displayVal)
    }
  }, [displayVal])

  const handlePercent = useCallback(() => {
    try {
      const num = parseFloat(displayVal)
      if (!isNaN(num)) {
        const val = num / 100
        setDisplayVal(formatCalcDisplay(val))
      }
    } catch {
      // ignore
    }
  }, [displayVal])

  const handleScientificFn = useCallback((fn: ScientificFn) => {
    try {
      const num = parseFloat(displayVal)
      const res = evaluateScientific(fn, num)
      const formatted = formatCalcDisplay(res)
      saveToHistory(`${fn}(${displayVal})`, formatted)
      setDisplayVal(formatted)
      setIsNewNumber(true)
    } catch {
      setDisplayVal('Error')
      setIsNewNumber(true)
    }
  }, [displayVal])

  // Keyboard support for calculator
  useEffect(() => {
    if (activeMode !== 'calc') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return

      if (e.key >= '0' && e.key <= '9') {
        handleInputDigit(e.key)
      } else if (e.key === '.' || e.key === ',') {
        handleInputDot()
      } else if (e.key === '+') {
        handleOperator('+')
      } else if (e.key === '-') {
        handleOperator('−')
      } else if (e.key === '*') {
        handleOperator('×')
      } else if (e.key === '/') {
        e.preventDefault()
        handleOperator('÷')
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleEvaluate()
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        handleClear()
      } else if (e.key === '%') {
        handlePercent()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeMode, handleInputDigit, handleInputDot, handleOperator, handleEvaluate, handleBackspace, handleClear, handlePercent])

  // ─── Converter Logic ────────────────────────────────────────
  const handleSwapUnits = () => {
    const prevFrom = fromUnitId
    const prevTo = toUnitId
    setFromUnitId(prevTo)
    setToUnitId(prevFrom)
  }

  const copyResult = (val: string, id: string) => {
    navigator.clipboard.writeText(val)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const primaryConvertedValue = useMemo(() => {
    const isRadix = activeCategory.id === 'radix'
    if (isRadix) {
      return fromUnitId === toUnitId ? convInput : convertRadix(convInput, fromUnitId, toUnitId)
    }
    const parsedNum = parseFloat(convInput)
    if (isNaN(parsedNum)) return '0'
    if (fromUnitId === toUnitId) return convInput
    const res = convertValue(parsedNum, fromUnitId, toUnitId, activeCategory)
    return formatFormattedValue(res)
  }, [activeCategory, fromUnitId, toUnitId, convInput])

  const conversionResults = useMemo(() => {
    const isRadix = activeCategory.id === 'radix'
    const parsedNum = parseFloat(convInput)
    const q = searchQuery.toLowerCase().trim()

    return activeCategory.units
      .filter((u) => {
        if (!q) return true
        return (
          u.name.en.toLowerCase().includes(q) ||
          u.name.pl.toLowerCase().includes(q) ||
          u.symbol.toLowerCase().includes(q) ||
          u.keywords?.some((k) => k.toLowerCase().includes(q))
        )
      })
      .map((unit) => {
        const isCurrent = unit.id === fromUnitId
        let formatted = ''

        if (isRadix) {
          formatted = isCurrent ? convInput : convertRadix(convInput, fromUnitId, unit.id)
        } else {
          if (isNaN(parsedNum)) {
            formatted = '0'
          } else if (isCurrent) {
            formatted = convInput
          } else {
            const res = convertValue(parsedNum, fromUnitId, unit.id, activeCategory)
            formatted = formatFormattedValue(res)
          }
        }

        return {
          unit,
          value: formatted,
          isCurrent,
        }
      })
  }, [activeCategory, fromUnitId, convInput, searchQuery])

  // Category options for PillGroup
  const categoryPillOptions = useMemo(() => {
    return UNIT_CATEGORIES.map((cat) => ({
      value: cat.id,
      label: cat.name[locale] || cat.name.en,
    }))
  }, [locale])

  // Mode options for PillGroup
  const modeOptions = useMemo(() => [
    { value: 'calc' as const, label: t.calculator },
    { value: 'convert' as const, label: t.unitConverter },
  ], [t])

  // Select dropdown options for units
  const unitSelectOptions = useMemo(() => {
    return activeCategory.units.map((u) => ({
      value: u.id,
      label: `${u.symbol} — ${u.name[locale]}`,
    }))
  }, [activeCategory, locale])

  return (
    <div className="all-calc-suite" data-eink={isEink}>
      <BoardLayout
        variant="wide"
        align="center"
        board={
          <div className="calc-stage">
            {activeMode === 'calc' ? (
              /* ─── CALCULATOR VIEW ─── */
              <Card variant="outlined" padding="none" className={`calc-card ${calcMode === 'scientific' ? 'calc-card--scientific' : ''}`}>
                {/* 1. Terminal Screen */}
                <div className="calc-screen">
                  <div className="calc-screen-meta">
                    <span className="calc-screen-expr">{expression || '\u00A0'}</span>
                    {activeOperator && (
                      <span className="calc-screen-op-badge">{activeOperator}</span>
                    )}
                  </div>
                  <div className={`calc-screen-digits ${displayVal.length > 12 ? 'calc-screen-digits--sm' : ''}`}>
                    {displayVal}
                  </div>
                </div>

                {/* 2. Scientific Keys (when toggled on) */}
                {calcMode === 'scientific' && (
                  <div className="calc-sci-grid">
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('sqrt')}>√</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('sqr')}>x²</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleOperator('^')}>^</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('inv')}>1/x</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('pi')}>π</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('e')}>e</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('sin')}>sin</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('cos')}>cos</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('tan')}>tan</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('ln')}>ln</Button>
                    <Button variant="secondary" size="sm" className="calc-key calc-key--sci" onClick={() => handleScientificFn('log')}>log</Button>
                  </div>
                )}

                {/* 3. Primary Keypad using AllUI Button */}
                <div className="calc-numpad">
                  <Button variant="secondary" className="calc-key calc-key--action" onClick={handleClear}>AC</Button>
                  <Button variant="secondary" className="calc-key calc-key--action" onClick={handleBackspace} aria-label="Backspace">
                    <BackspaceIcon />
                  </Button>
                  <Button variant="secondary" className="calc-key calc-key--action" onClick={handlePercent}>%</Button>
                  <Button
                    variant={activeOperator === '÷' ? 'primary' : 'secondary'}
                    className={`calc-key calc-key--op ${activeOperator === '÷' ? 'calc-key--op-active' : ''}`}
                    onClick={() => handleOperator('÷')}
                  >
                    ÷
                  </Button>

                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('7')}>7</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('8')}>8</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('9')}>9</Button>
                  <Button
                    variant={activeOperator === '×' ? 'primary' : 'secondary'}
                    className={`calc-key calc-key--op ${activeOperator === '×' ? 'calc-key--op-active' : ''}`}
                    onClick={() => handleOperator('×')}
                  >
                    ×
                  </Button>

                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('4')}>4</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('5')}>5</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('6')}>6</Button>
                  <Button
                    variant={activeOperator === '−' ? 'primary' : 'secondary'}
                    className={`calc-key calc-key--op ${activeOperator === '−' ? 'calc-key--op-active' : ''}`}
                    onClick={() => handleOperator('−')}
                  >
                    −</Button>

                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('1')}>1</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('2')}>2</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('3')}>3</Button>
                  <Button
                    variant={activeOperator === '+' ? 'primary' : 'secondary'}
                    className={`calc-key calc-key--op ${activeOperator === '+' ? 'calc-key--op-active' : ''}`}
                    onClick={() => handleOperator('+')}
                  >
                    +
                  </Button>

                  <Button variant="secondary" className="calc-key calc-key--action" onClick={handleToggleSign}>±</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={() => handleInputDigit('0')}>0</Button>
                  <Button variant="secondary" className="calc-key calc-key--num" onClick={handleInputDot}>.</Button>
                  <Button variant="primary" className="calc-key calc-key--equals" onClick={handleEvaluate}>=</Button>
                </div>
              </Card>
            ) : (
              /* ─── UNIT CONVERTER VIEW ─── */
              <Card variant="outlined" padding="none" className="conv-card">
                {/* 1. Category Bar using AllUI PillGroup */}
                <div className="conv-category-strip">
                  <PillGroup
                    size="sm"
                    options={categoryPillOptions}
                    value={selectedCatId}
                    onChange={(cat) => {
                      setSelectedCatId(cat)
                      setSearchQuery('')
                    }}
                  />
                </div>

                {/* 2. From & To Hero Conversion Box */}
                <Card variant="flat" padding="none" className="conv-exchange-box">
                  {/* From Row */}
                  <div className="conv-unit-row">
                    <div className="conv-input-wrap">
                      <Input
                        label={t.from}
                        type={activeCategory.id === 'radix' ? 'text' : 'number'}
                        value={convInput}
                        onChange={(e) => setConvInput(e.target.value)}
                        placeholder="0"
                        step="any"
                        fullWidth
                      />
                    </div>
                    <div className="conv-select-wrap">
                      <Select
                        label={t.category}
                        options={unitSelectOptions}
                        value={fromUnitId}
                        onChange={(e) => setFromUnitId(e.target.value)}
                        fullWidth
                      />
                    </div>
                  </div>

                  {/* Centered Swap Divider */}
                  <div className="conv-divider">
                    <IconButton
                      variant="secondary"
                      size="sm"
                      rounded
                      icon={<SwapIcon />}
                      aria-label={t.swap}
                      title={t.swap}
                      onClick={handleSwapUnits}
                    />
                  </div>

                  {/* To Row */}
                  <div className="conv-unit-row conv-unit-row--target">
                    <div className="conv-input-wrap">
                      <span className="conv-field-tag">{t.to}</span>
                      <div className="conv-result-display">
                        <span className="conv-result-num">{primaryConvertedValue}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyResult(primaryConvertedValue, 'main-target')}
                          icon={copiedId === 'main-target' ? <CheckIcon /> : <CopyIcon />}
                          title={t.copy}
                        >
                          {copiedId === 'main-target' ? t.copied : t.copy}
                        </Button>
                      </div>
                    </div>
                    <div className="conv-select-wrap">
                      <Select
                        label={t.to}
                        options={unitSelectOptions}
                        value={toUnitId}
                        onChange={(e) => setToUnitId(e.target.value)}
                        fullWidth
                      />
                    </div>
                  </div>
                </Card>

                {/* 3. Live All Units Matrix with Search */}
                <Card variant="flat" padding="none" className="conv-matrix-card">
                  <div className="conv-matrix-header">
                    <span className="conv-matrix-title">{t.equivalentInOtherUnits}</span>
                    <div className="conv-matrix-search">
                      <Input
                        startIcon={<SearchIcon />}
                        placeholder={t.searchUnitPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="conv-matrix-list">
                    {conversionResults.map(({ unit, value, isCurrent }) => (
                      <div
                        key={unit.id}
                        className={`conv-matrix-item ${isCurrent ? 'conv-matrix-item--current' : ''}`}
                        onClick={() => {
                          if (!isCurrent) setToUnitId(unit.id)
                        }}
                      >
                        <div className="conv-matrix-left">
                          <span className="conv-matrix-unit-name">{unit.name[locale]}</span>
                          <span className="conv-matrix-unit-val">{value}</span>
                        </div>
                        <div className="conv-matrix-right">
                          <span className="conv-matrix-unit-sym">{unit.symbol}</span>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            icon={copiedId === unit.id ? <CheckIcon /> : <CopyIcon />}
                            aria-label={t.copy}
                            onClick={(e) => {
                              e.stopPropagation()
                              copyResult(value, unit.id)
                            }}
                            title={t.copy}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Card>
            )}
          </div>
        }
        controls={
          <ControlsBar>
            <PillGroup<ToolMode>
              size="sm"
              options={modeOptions}
              value={activeMode}
              onChange={(m) => setActiveMode(m)}
            />

            {activeMode === 'calc' ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCalcMode((m) => (m === 'standard' ? 'scientific' : 'standard'))}
                >
                  {calcMode === 'standard' ? t.scientific : t.standard}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleClear}
                  icon={<RotateCcwIcon />}
                >
                  {t.clear}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsHistoryOpen(true)}
                  icon={<HistoryIcon />}
                >
                  {t.history} ({history.length})
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSwapUnits}
                  icon={<SwapIcon />}
                >
                  {t.swap}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setConvInput('1')
                    setSearchQuery('')
                  }}
                  icon={<RotateCcwIcon />}
                >
                  {t.reset}
                </Button>
              </>
            )}
          </ControlsBar>
        }
      />

      {/* History Dialog Modal using AllUI Dialog */}
      <Dialog
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={t.history}
        maxWidth="sm"
      >
        <div className="calc-history-dialog">
          {history.length > 0 && (
            <div className="calc-history-dialog-actions">
              <Button
                variant="secondary"
                size="sm"
                onClick={clearHistory}
                icon={<TrashIcon />}
              >
                {t.clearHistory}
              </Button>
            </div>
          )}

          <div className="calc-history-dialog-list">
            {history.length === 0 ? (
              <div className="calc-history-empty">{t.noHistory}</div>
            ) : (
              history.map((h) => (
                <div
                  key={h.id}
                  className="calc-history-dialog-item"
                  onClick={() => {
                    setDisplayVal(h.result)
                    setIsNewNumber(true)
                    setIsHistoryOpen(false)
                  }}
                  title={t.clickToUse}
                >
                  <span className="calc-history-dialog-expr">{h.expression}</span>
                  <div className="calc-history-dialog-row">
                    <span className="calc-history-dialog-res">= {h.result}</span>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={copiedId === h.id ? <CheckIcon /> : <CopyIcon />}
                      aria-label={t.copy}
                      onClick={(e) => {
                        e.stopPropagation()
                        copyResult(h.result, h.id)
                      }}
                      title={t.copy}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  )
}
export default CalcConverter

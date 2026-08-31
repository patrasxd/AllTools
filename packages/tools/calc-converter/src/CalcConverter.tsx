import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  PillGroup,
  StatsHeader,
  GameButton,
  ControlsBar,
  IconCopy,
  IconCheck,
  IconSearch,
  IconRotateCcw,
  IconCalculator,
  IconScale,
} from '@alltools/ui'
import { ToolComponentProps, ToolMode, CalcMode, CalcHistoryItem } from './types'
import { UNIT_CATEGORIES, convertValue, convertRadix, formatFormattedValue } from './conversionData'
import './styles/calc-converter.css'

export function CalcConverter({ locale = 'en', setHeader }: ToolComponentProps) {
  const [activeMode, setActiveMode] = useState<ToolMode>('calc')

  // ─── Calculator State ───────────────────────────────────────
  const [calcMode, setCalcMode] = useState<CalcMode>('standard')
  const [expression, setExpression] = useState<string>('')
  const [displayVal, setDisplayVal] = useState<string>('0')
  const [isNewNumber, setIsNewNumber] = useState<boolean>(true)
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
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const activeCategory = useMemo(() => {
    return UNIT_CATEGORIES.find((c) => c.id === selectedCatId) || UNIT_CATEGORIES[0]
  }, [selectedCatId])

  // Sync unit when category changes
  useEffect(() => {
    if (!activeCategory.units.some((u) => u.id === fromUnitId)) {
      setFromUnitId(activeCategory.units[0]?.id || activeCategory.baseUnit)
    }
  }, [activeCategory, fromUnitId])

  // ─── Top StatsHeader Sync ───────────────────────────────────
  useEffect(() => {
    if (!setHeader) return
    if (activeMode === 'calc') {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'KALKULATOR' : 'CALCULATOR'}
          items={[
            { key: 'mode', label: locale === 'pl' ? 'TRYB' : 'MODE', value: calcMode === 'scientific' ? (locale === 'pl' ? 'NAUKOWY' : 'SCI') : (locale === 'pl' ? 'STANDARD' : 'STD') },
            { key: 'hist', label: locale === 'pl' ? 'HISTORIA' : 'HISTORY', value: history.length },
          ]}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'PRZELICZNIK JEDNOSTEK' : 'UNIT CONVERTER'}
          items={[
            { key: 'cat', label: locale === 'pl' ? 'KATEGORIA' : 'CATEGORY', value: activeCategory.name[locale].toUpperCase() },
            { key: 'unit', label: locale === 'pl' ? 'JEDNOSTKA' : 'UNIT', value: fromUnitId.toUpperCase() },
          ]}
        />
      )
    }
  }, [setHeader, activeMode, calcMode, history.length, activeCategory, fromUnitId, locale])

  // ─── Calculator Evaluation Engine ───────────────────────────
  const saveToHistory = (expr: string, res: string) => {
    const item: CalcHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      expression: expr,
      result: res,
      timestamp: Date.now(),
    }
    const updated = [item, ...history.filter((h) => h.expression !== expr)].slice(0, 10)
    setHistory(updated)
    try {
      localStorage.setItem('alltools:calc-history', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  const safeEvaluate = (exprStr: string): number => {
    // Sanitize and replace math symbols
    let sanitized = exprStr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**')
      .replace(/π/g, `${Math.PI}`)
      .replace(/e(?![a-zA-Z0-9_])/g, `${Math.E}`)

    // Handle functions like sqrt, sin, cos, tan, log, ln
    sanitized = sanitized
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/log\(/g, 'Math.log10(')

    // Verify sanitized expression contains only allowed mathematical characters
    if (!/^[0-9+\-*/().,%\sMath.PIEsqrtincoatgl**]+$/.test(sanitized)) {
      throw new Error('Invalid expression')
    }

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitized})`)()
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      throw new Error('Math error')
    }
    return result
  }

  const handleInputDigit = (digit: string) => {
    if (isNewNumber || displayVal === '0') {
      setDisplayVal(digit)
      setIsNewNumber(false)
    } else {
      setDisplayVal(displayVal + digit)
    }
  }

  const handleInputDot = () => {
    if (isNewNumber) {
      setDisplayVal('0.')
      setIsNewNumber(false)
    } else if (!displayVal.includes('.')) {
      setDisplayVal(displayVal + '.')
    }
  }

  const handleOperator = (op: string) => {
    const currentExpr = expression ? `${expression} ${displayVal} ${op}` : `${displayVal} ${op}`
    setExpression(currentExpr)
    setIsNewNumber(true)
  }

  const handleEvaluate = () => {
    if (!expression && isNewNumber) return
    const fullExpr = expression ? `${expression} ${displayVal}` : displayVal
    try {
      const result = safeEvaluate(fullExpr)
      const formatted = formatFormattedValue(result)
      saveToHistory(fullExpr, formatted)
      setExpression('')
      setDisplayVal(formatted)
      setIsNewNumber(true)
    } catch {
      setDisplayVal('Error')
      setIsNewNumber(true)
    }
  }

  const handleClear = () => {
    setDisplayVal('0')
    setExpression('')
    setIsNewNumber(true)
  }

  const handleBackspace = () => {
    if (isNewNumber) return
    if (displayVal.length <= 1 || displayVal === 'Error') {
      setDisplayVal('0')
      setIsNewNumber(true)
    } else {
      setDisplayVal(displayVal.slice(0, -1))
    }
  }

  const handleToggleSign = () => {
    if (displayVal === '0' || displayVal === 'Error') return
    if (displayVal.startsWith('-')) {
      setDisplayVal(displayVal.slice(1))
    } else {
      setDisplayVal('-' + displayVal)
    }
  }

  const handlePercent = () => {
    try {
      const num = parseFloat(displayVal)
      if (!isNaN(num)) {
        const val = num / 100
        setDisplayVal(formatFormattedValue(val))
      }
    } catch {
      // ignore
    }
  }

  const handleScientificFn = (fn: string) => {
    try {
      const num = parseFloat(displayVal)
      let res = 0
      switch (fn) {
        case 'sqr':
          res = num * num
          break
        case 'sqrt':
          if (num < 0) throw new Error('Negative sqrt')
          res = Math.sqrt(num)
          break
        case 'inv':
          if (num === 0) throw new Error('Division by zero')
          res = 1 / num
          break
        case 'sin':
          res = Math.sin((num * Math.PI) / 180)
          break
        case 'cos':
          res = Math.cos((num * Math.PI) / 180)
          break
        case 'tan':
          res = Math.tan((num * Math.PI) / 180)
          break
        case 'ln':
          if (num <= 0) throw new Error('Non-positive ln')
          res = Math.log(num)
          break
        case 'log':
          if (num <= 0) throw new Error('Non-positive log')
          res = Math.log10(num)
          break
        case 'pi':
          res = Math.PI
          break
        case 'e':
          res = Math.E
          break
      }
      const formatted = formatFormattedValue(res)
      saveToHistory(`${fn}(${displayVal})`, formatted)
      setDisplayVal(formatted)
      setIsNewNumber(true)
    } catch {
      setDisplayVal('Error')
      setIsNewNumber(true)
    }
  }

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
  })

  // ─── Converter Search & Filter ──────────────────────────────
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) return

    const q = query.toLowerCase().trim()
    // Find matching category or unit
    for (const cat of UNIT_CATEGORIES) {
      if (cat.name.en.toLowerCase().includes(q) || cat.name.pl.toLowerCase().includes(q)) {
        setSelectedCatId(cat.id)
        return
      }
      for (const unit of cat.units) {
        if (
          unit.symbol.toLowerCase() === q ||
          unit.name.en.toLowerCase().includes(q) ||
          unit.name.pl.toLowerCase().includes(q) ||
          unit.keywords?.some((k) => k.toLowerCase().includes(q))
        ) {
          setSelectedCatId(cat.id)
          setFromUnitId(unit.id)
          return
        }
      }
    }
  }

  const copyResult = (val: string, id: string) => {
    navigator.clipboard.writeText(val)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // ─── Converter Multi-View Calculation ───────────────────────
  const conversionResults = useMemo(() => {
    const isRadix = activeCategory.id === 'radix'
    const parsedNum = parseFloat(convInput)

    return activeCategory.units.map((unit) => {
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
  }, [activeCategory, fromUnitId, convInput])

  const modeOptions = [
    { value: 'calc' as const, label: locale === 'pl' ? 'Kalkulator' : 'Calculator' },
    { value: 'convert' as const, label: locale === 'pl' ? 'Przelicznik' : 'Converter' },
  ]

  const categoryOptions = [
    { id: 'weight', label: locale === 'pl' ? 'Masa / Waga' : 'Weight' },
    { id: 'length', label: locale === 'pl' ? 'Długość' : 'Length' },
    { id: 'volume', label: locale === 'pl' ? 'Kuchnia / Objętość' : 'Kitchen / Vol' },
    { id: 'speed', label: locale === 'pl' ? 'Prędkość' : 'Speed' },
    { id: 'temperature', label: locale === 'pl' ? 'Temperatura' : 'Temp' },
    { id: 'fuel', label: locale === 'pl' ? 'Spalanie' : 'Fuel' },
    { id: 'pressure', label: locale === 'pl' ? 'Ciśnienie' : 'Pressure' },
    { id: 'area', label: locale === 'pl' ? 'Powierzchnia' : 'Area' },
    { id: 'data', label: locale === 'pl' ? 'Dane' : 'Data' },
    { id: 'radix', label: locale === 'pl' ? 'BIN / HEX' : 'Radix' },
    { id: 'time', label: locale === 'pl' ? 'Czas' : 'Time' },
  ]

  return (
    <div className="calc-root">
      {/* 1. Status Block (Top) */}
      <div className="calc-status">
        <div className="calc-status-text">
          {activeMode === 'calc'
            ? (locale === 'pl' ? 'Kalkulator' : 'Calculator')
            : `${activeCategory.name[locale]}`}
        </div>
      </div>

      {/* 2. Main Viewport (Center) */}
      <div className={`calc-center-area ${activeMode === 'calc' ? 'calc-center-area--calc' : ''}`}>
        {activeMode === 'calc' ? (
          /* ─── CALCULATOR VIEW ─── */
          <div className={`calc-view ${calcMode === 'scientific' ? 'calc-view--sci' : ''}`}>
            {/* Screen */}
            <div className="calc-screen">
              <div className="calc-screen-expr">{expression || '\u00A0'}</div>
              <div className="calc-screen-val">{displayVal}</div>
            </div>

            {/* History Strip */}
            {history.length > 0 && (
              <div className="calc-history-strip">
                {history.slice(0, 5).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    className="calc-history-pill"
                    onClick={() => {
                      setDisplayVal(h.result)
                      setIsNewNumber(true)
                    }}
                    title={h.expression}
                  >
                    {h.expression} = {h.result}
                  </button>
                ))}
              </div>
            )}

            {/* Keypad Container */}
            <div className="calc-keypad-container">
              {/* Scientific row (if scientific active) */}
              {calcMode === 'scientific' && (
                <div className="calc-sci-grid">
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('sqrt')}>√</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('sqr')}>x²</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleOperator('^')}>^</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('inv')}>1/x</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('pi')}>π</button>

                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('sin')}>sin</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('cos')}>cos</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('tan')}>tan</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('ln')}>ln</button>
                  <button type="button" className="calc-key calc-key--sci" onClick={() => handleScientificFn('log')}>log</button>
                </div>
              )}

              {/* Main Keypad */}
              <div className="calc-main-grid">
                <button type="button" className="calc-key calc-key--action" onClick={handleClear}>AC</button>
                <button type="button" className="calc-key calc-key--action" onClick={handleBackspace}>⌫</button>
                <button type="button" className="calc-key calc-key--action" onClick={handlePercent}>%</button>
                <button type="button" className="calc-key calc-key--op" onClick={() => handleOperator('÷')}>÷</button>

                <button type="button" className="calc-key" onClick={() => handleInputDigit('7')}>7</button>
                <button type="button" className="calc-key" onClick={() => handleInputDigit('8')}>8</button>
                <button type="button" className="calc-key" onClick={() => handleInputDigit('9')}>9</button>
                <button type="button" className="calc-key calc-key--op" onClick={() => handleOperator('×')}>×</button>

                <button type="button" className="calc-key" onClick={() => handleInputDigit('4')}>4</button>
                <button type="button" className="calc-key" onClick={() => handleInputDigit('5')}>5</button>
                <button type="button" className="calc-key" onClick={() => handleInputDigit('6')}>6</button>
                <button type="button" className="calc-key calc-key--op" onClick={() => handleOperator('−')}>−</button>

                <button type="button" className="calc-key" onClick={() => handleInputDigit('1')}>1</button>
                <button type="button" className="calc-key" onClick={() => handleInputDigit('2')}>2</button>
                <button type="button" className="calc-key" onClick={() => handleInputDigit('3')}>3</button>
                <button type="button" className="calc-key calc-key--op" onClick={() => handleOperator('+')}>+</button>

                <button type="button" className="calc-key" onClick={handleToggleSign}>±</button>
                <button type="button" className="calc-key" onClick={() => handleInputDigit('0')}>0</button>
                <button type="button" className="calc-key" onClick={handleInputDot}>.</button>
                <button type="button" className="calc-key calc-key--equals" onClick={handleEvaluate}>=</button>
              </div>
            </div>
          </div>
        ) : (
          /* ─── UNIT CONVERTER VIEW ─── */
          <div className="conv-view">
            {/* Search Bar */}
            <div className="conv-search-box">
              <IconSearch size={14} className="conv-search-icon" />
              <input
                type="text"
                className="conv-search-input"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={locale === 'pl' ? 'Szukaj jednostki... (np. psi, węzły, mpg, funty, hex)' : 'Search unit... (e.g. psi, knots, mpg, lb, hex)'}
              />
            </div>

            {/* Category Filter Pills */}
            <div className="conv-cat-bar">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`conv-cat-pill ${selectedCatId === cat.id ? 'conv-cat-pill--active' : ''}`}
                  onClick={() => {
                    setSelectedCatId(cat.id)
                    setSearchQuery('')
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Input Card */}
            <div className="conv-input-card">
              <div className="conv-input-row">
                <input
                  type={activeCategory.id === 'radix' ? 'text' : 'number'}
                  className="conv-num-input"
                  value={convInput}
                  onChange={(e) => setConvInput(e.target.value)}
                  placeholder="0"
                  step="any"
                />
                <select
                  className="conv-unit-select"
                  value={fromUnitId}
                  onChange={(e) => setFromUnitId(e.target.value)}
                >
                  {activeCategory.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.symbol} — {u.name[locale]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Results Scrollable Table (Fixed Height like Stopwatch Laps) */}
            <div className="conv-results-table">
              {conversionResults.map(({ unit, value, isCurrent }) => (
                <div
                  key={unit.id}
                  className={`conv-result-row ${isCurrent ? 'conv-result-row--active' : ''}`}
                  onClick={() => {
                    if (!isCurrent) {
                      setFromUnitId(unit.id)
                      setConvInput(value)
                    }
                  }}
                  title={locale === 'pl' ? 'Kliknij, aby ustawić jako jednostkę wejściową' : 'Click to set as active input unit'}
                >
                  <div className="conv-result-left">
                    <span className="conv-result-name">{unit.name[locale]}</span>
                    <span className="conv-result-val">{value}</span>
                  </div>
                  <div className="conv-result-right">
                    <span className="conv-result-symbol">{unit.symbol}</span>
                    <button
                      type="button"
                      className="conv-copy-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyResult(value, unit.id)
                      }}
                      title={locale === 'pl' ? 'Kopiuj' : 'Copy'}
                    >
                      {copiedId === unit.id ? <IconCheck size={13} /> : <IconCopy size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Controls Bar */}
      <div className="calc-controls-container">
        <ControlsBar>
          {/* Mode Switcher Pills (Consistent position on the left across all views) */}
          <PillGroup
            options={modeOptions}
            value={activeMode}
            onChange={setActiveMode}
          />

          {activeMode === 'calc' ? (
            <>
              <GameButton
                variant="secondary"
                size="md"
                onClick={() => setCalcMode((m) => (m === 'standard' ? 'scientific' : 'standard'))}
                icon={<IconCalculator size={14} />}
              >
                {calcMode === 'standard'
                  ? (locale === 'pl' ? 'Naukowy' : 'Scientific')
                  : (locale === 'pl' ? 'Standard' : 'Standard')}
              </GameButton>
              <GameButton
                variant="secondary"
                size="md"
                onClick={handleClear}
                icon={<IconRotateCcw size={14} />}
              >
                {locale === 'pl' ? 'Wyczyść' : 'Clear'}
              </GameButton>
            </>
          ) : (
            <>
              <GameButton
                variant="secondary"
                size="md"
                onClick={() => {
                  setConvInput('1')
                  setSearchQuery('')
                }}
                icon={<IconRotateCcw size={14} />}
              >
                {locale === 'pl' ? 'Resetuj' : 'Reset'}
              </GameButton>
            </>
          )}
        </ControlsBar>
      </div>
    </div>
  )
}

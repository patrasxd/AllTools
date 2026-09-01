import React, { useState, useEffect } from 'react'
import { BubbleLevel } from './components/BubbleLevel'
import { Protractor } from './components/Protractor'
import { Compass } from './components/Compass'
import {
  PillGroup,
  StatsHeader,
  GameButton,
  ControlsBar,
  formatAngle,
} from '@alltools/ui'
import './styles/level-protractor.css'

export interface ToolComponentProps {
  locale: 'en' | 'pl'
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

export function LevelProtractor({ locale = 'en', setHeader }: ToolComponentProps) {
  const [activeTab, setActiveTab] = useState<'level' | 'protractor' | 'compass'>('level')

  // Level State
  const [pitch, setPitch] = useState<number>(0)
  const [roll, setRoll] = useState<number>(0)
  const [calibratedPitch, setCalibratedPitch] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:level:calibration')
      return saved ? JSON.parse(saved).pitch : 0
    } catch {
      return 0
    }
  })
  const [calibratedRoll, setCalibratedRoll] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:level:calibration')
      return saved ? JSON.parse(saved).roll : 0
    } catch {
      return 0
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('alltools:level:calibration', JSON.stringify({ pitch: calibratedPitch, roll: calibratedRoll }))
    } catch {
      // Ignore
    }
  }, [calibratedPitch, calibratedRoll])
  const [levelStats, setLevelStats] = useState<{ pitch: number; roll: number; isLevel: boolean }>({
    pitch: 0,
    roll: 0,
    isLevel: false,
  })

  // Protractor State
  const [arm1Angle, setArm1Angle] = useState<number>(0)
  const [arm2Angle, setArm2Angle] = useState<number>(45)
  const [activeArm, setActiveArm] = useState<1 | 2 | null>(null)
  const [isFrozen, setIsFrozen] = useState<boolean>(false)
  const [protractorStats, setProtractorStats] = useState<{ angle: number; rad: number }>({
    angle: 45,
    rad: 0.785,
  })

  // Compass State
  const [compassStats, setCompassStats] = useState<{ heading: number; direction: string }>({
    heading: 0,
    direction: 'N',
  })

  // Sync StatsHeader to shell top title bar
  useEffect(() => {
    if (!setHeader) return

    if (activeTab === 'level') {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'POZIOMICA 2D' : '2D BUBBLE LEVEL'}
          items={[
            {
              key: 'roll',
              label: 'ROLL',
              value: formatAngle(levelStats.roll, 1),
            },
            {
              key: 'pitch',
              label: 'PITCH',
              value: formatAngle(levelStats.pitch, 1),
            },
            {
              key: 'status',
              label: 'STATUS',
              value: levelStats.isLevel ? (locale === 'pl' ? 'POZIOM' : 'LEVEL') : (locale === 'pl' ? 'PRZECHYŁ' : 'TILT'),
              className: levelStats.isLevel ? 'text-text font-bold' : 'text-text-muted',
            },
          ]}
        />
      )
    } else if (activeTab === 'protractor') {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'KĄTOMIERZ' : 'PROTRACTOR'}
          items={[
            {
              key: 'angle',
              label: locale === 'pl' ? 'KĄT' : 'ANGLE',
              value: formatAngle(protractorStats.angle, 1),
            },
            {
              key: 'rad',
              label: 'RAD',
              value: protractorStats.rad.toFixed(3),
            },
            {
              key: 'suppl',
              label: '180°-θ',
              value: formatAngle(Math.max(0, 180 - protractorStats.angle), 1),
            },
          ]}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'KOMPAS CYFROWY' : 'DIGITAL COMPASS'}
          items={[
            {
              key: 'heading',
              label: locale === 'pl' ? 'AZYMUT' : 'HEADING',
              value: `${compassStats.heading}°`,
            },
            {
              key: 'dir',
              label: locale === 'pl' ? 'KIERUNEK' : 'DIRECTION',
              value: compassStats.direction,
            },
            {
              key: 'type',
              label: locale === 'pl' ? 'TYP' : 'TYPE',
              value: 'MAGN.',
            },
          ]}
        />
      )
    }
  }, [setHeader, activeTab, levelStats, protractorStats, compassStats, locale])

  const tabOptions = [
    { value: 'level' as const, label: locale === 'pl' ? 'Poziomica' : 'Level' },
    { value: 'protractor' as const, label: locale === 'pl' ? 'Kątomierz' : 'Protractor' },
    { value: 'compass' as const, label: locale === 'pl' ? 'Kompas' : 'Compass' },
  ]

  const calibrate = () => {
    setCalibratedPitch(pitch)
    setCalibratedRoll(roll)
  }

  const resetCalibration = () => {
    setCalibratedPitch(0)
    setCalibratedRoll(0)
  }

  return (
    <div className="level-root">
      {/* 1. Status Block (Top) */}
      <div className="level-status">
        <div className="level-status-text">
          {activeTab === 'level'
            ? levelStats.isLevel
              ? (locale === 'pl' ? 'Idealny poziom (0.0°)' : 'Perfect level (0.0°)')
              : (locale === 'pl' ? 'Wykryto nachylenie' : 'Tilt detected')
            : activeTab === 'protractor'
            ? isFrozen
              ? (locale === 'pl' ? 'Kąt zablokowany' : 'Angle locked')
              : `${formatAngle(protractorStats.angle, 1)} (${protractorStats.angle < 90 ? (locale === 'pl' ? 'Kąt ostry' : 'Acute angle') : protractorStats.angle === 90 ? (locale === 'pl' ? 'Kąt prosty' : 'Right angle') : (locale === 'pl' ? 'Kąt rozwarty' : 'Obtuse angle')})`
            : isFrozen
            ? (locale === 'pl' ? 'Kierunek zablokowany' : 'Heading locked')
            : `${compassStats.heading}° ${compassStats.direction} (${locale === 'pl' ? 'Północ magnetyczna' : 'Magnetic North'})`}
        </div>
        <div className="level-status-sub">
          {activeTab === 'level'
            ? `ROLL: ${formatAngle(levelStats.roll, 1)} · PITCH: ${formatAngle(levelStats.pitch, 1)}`
            : activeTab === 'protractor'
            ? `RAD: ${protractorStats.rad.toFixed(3)} · 180°-θ: ${formatAngle(Math.max(0, 180 - protractorStats.angle), 1)}`
            : `${locale === 'pl' ? 'AZYMUT' : 'HEADING'}: ${compassStats.heading}° · ${locale === 'pl' ? 'KIERUNEK' : 'DIRECTION'}: ${compassStats.direction}`}
        </div>
      </div>

      {/* 2. Main Viewport Area (Center) */}
      <div className="level-center-area">
        {activeTab === 'level' ? (
          <BubbleLevel
            locale={locale}
            onStatsChange={setLevelStats}
            calibratedPitch={calibratedPitch}
            calibratedRoll={calibratedRoll}
            pitch={pitch}
            roll={roll}
            setPitch={setPitch}
            setRoll={setRoll}
          />
        ) : activeTab === 'protractor' ? (
          <Protractor
            locale={locale}
            onStatsChange={setProtractorStats}
            arm1Angle={arm1Angle}
            arm2Angle={arm2Angle}
            setArm1Angle={setArm1Angle}
            setArm2Angle={setArm2Angle}
            activeArm={activeArm}
            setActiveArm={setActiveArm}
            isFrozen={isFrozen}
          />
        ) : (
          <Compass
            locale={locale}
            isFrozen={isFrozen}
            onHeadingChange={(heading, direction) => setCompassStats({ heading, direction })}
          />
        )}
      </div>

      {/* 3. Controls Bar (Bottom - Fixed Width Twin to Stopwatch) */}
      <div className="level-controls-container">
        <ControlsBar>
          {activeTab === 'level' ? (
            <>
              <GameButton variant="primary" size="md" onClick={calibrate}>
                {locale === 'pl' ? 'Wyzeruj' : 'Calibrate'}
              </GameButton>
              {(calibratedPitch !== 0 || calibratedRoll !== 0) && (
                <GameButton variant="secondary" size="md" onClick={resetCalibration}>
                  {locale === 'pl' ? 'Resetuj zero' : 'Reset Zero'}
                </GameButton>
              )}
            </>
          ) : activeTab === 'protractor' ? (
            <>
              <GameButton
                variant={isFrozen ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setIsFrozen(!isFrozen)}
              >
                {isFrozen ? (locale === 'pl' ? 'Odblokuj' : 'Unlock') : (locale === 'pl' ? 'Zablokuj' : 'Lock')}
              </GameButton>
              <GameButton
                variant="ghost"
                size="md"
                onClick={() => {
                  setArm1Angle(0)
                  setArm2Angle(45)
                  setIsFrozen(false)
                }}
              >
                {locale === 'pl' ? 'Reset (45°)' : 'Reset (45°)'}
              </GameButton>
            </>
          ) : (
            <GameButton
              variant={isFrozen ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setIsFrozen(!isFrozen)}
            >
              {isFrozen ? (locale === 'pl' ? 'Odblokuj' : 'Unlock') : (locale === 'pl' ? 'Zablokuj' : 'Lock')}
            </GameButton>
          )}

          {/* Mode Switcher Pills */}
          <PillGroup
            options={tabOptions}
            value={activeTab}
            onChange={(t) => {
              setActiveTab(t)
              setIsFrozen(false)
            }}
          />
        </ControlsBar>
      </div>
    </div>
  )
}

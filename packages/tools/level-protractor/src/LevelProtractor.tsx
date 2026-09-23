import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BoardLayout,
  Card,
  Button,
  ControlsBar,
  PillGroup,
  StatsHeader,
  Dialog,
  SettingsGroup,
  SettingsIcon,
  RestartIcon,
} from '@all/ui'
import { BubbleLevel } from './components/BubbleLevel'
import { TubularLevel } from './components/TubularLevel'
import { Protractor } from './components/Protractor'
import { Compass } from './components/Compass'
import {
  type TiltResult,
  type ProtractorAngleResult,
  type EdgeLevelResult,
  type PhoneOrientation,
  detectPhoneOrientation,
  calculateSlopePercent,
  requiresOrientationPermission,
  requestOrientationPermission,
} from './utils/sensorUtils'
import { levelTranslations } from './i18n'
import type {
  ToolComponentProps,
  LevelProtractorTab,
  LevelViewMode,
  LevelStats,
  ProtractorStats,
  CompassStats,
} from './types'
import './styles/level-protractor.css'

export function LevelProtractor({
  locale = 'en',
  setHeader,
  isEink = false,
  theme,
}: ToolComponentProps) {
  const t = levelTranslations[locale] || levelTranslations.en

  const [activeTab, setActiveTab] = useState<LevelProtractorTab>(() => {
    try {
      const saved = localStorage.getItem('alltools:level:tab') as LevelProtractorTab
      if (saved && (saved === 'level' || saved === 'protractor' || saved === 'compass')) {
        return saved
      }
    } catch {}
    return 'level'
  })

  // Settings State
  const [tolerance, setTolerance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:level:tolerance')
      if (saved) {
        const val = parseFloat(saved)
        if (Number.isFinite(val)) return val
      }
    } catch {}
    return 0.5
  })

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [sensorPermissionGranted, setSensorPermissionGranted] = useState<boolean>(false)

  useEffect(() => {
    try {
      localStorage.setItem('alltools:level:tab', activeTab)
    } catch {}
  }, [activeTab])

  useEffect(() => {
    try {
      localStorage.setItem('alltools:level:tolerance', String(tolerance))
    } catch {}
  }, [tolerance])

  // ─── Level State ───
  const [levelViewMode, setLevelViewMode] = useState<LevelViewMode>(() => {
    try {
      const saved = localStorage.getItem('alltools:level:viewMode') as LevelViewMode
      if (saved && (saved === 'surface' || saved === 'edge')) {
        return saved
      }
    } catch {}
    return 'surface'
  })



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
      localStorage.setItem(
        'alltools:level:calibration',
        JSON.stringify({ pitch: calibratedPitch, roll: calibratedRoll })
      )
    } catch {}
  }, [calibratedPitch, calibratedRoll])

  useEffect(() => {
    try {
      localStorage.setItem('alltools:level:viewMode', levelViewMode)
    } catch {}
  }, [levelViewMode])

  const [levelStats, setLevelStats] = useState<LevelStats>({
    pitch: 0,
    roll: 0,
    isLevel: false,
    viewMode: 'auto',
    edgeAngle: 0,
    slopePercent: 0,
  })

  const isEdgeView = levelViewMode === 'edge'

  const handleEdgeStatsChange = useCallback(
    (stats: EdgeLevelResult) => {
      setLevelStats({
        pitch: Math.round((pitch - calibratedPitch) * 10) / 10,
        roll: Math.round((roll - calibratedRoll) * 10) / 10,
        isLevel: stats.isLevel,
        viewMode: levelViewMode,
        edgeAngle: stats.absAngle,
        slopePercent: stats.slopePercent,
        orientation: stats.orientation,
      })
    },
    [pitch, roll, calibratedPitch, calibratedRoll, levelViewMode]
  )

  const handleSurfaceStatsChange = useCallback(
    (stats: TiltResult) => {
      const absRoll = Math.abs(stats.roll)
      setLevelStats({
        pitch: stats.pitch,
        roll: stats.roll,
        isLevel: stats.isLevel,
        viewMode: levelViewMode,
        edgeAngle: absRoll,
        slopePercent: calculateSlopePercent(absRoll),
        targetAngle: 0,
        isTargetMatch: stats.isLevel,
      })
    },
    [levelViewMode]
  )

  // ─── Protractor State ───
  const [arm1Angle, setArm1Angle] = useState<number>(0)
  const [arm2Angle, setArm2Angle] = useState<number>(45)
  const [activeArm, setActiveArm] = useState<1 | 2 | null>(null)
  const [isFrozen, setIsFrozen] = useState<boolean>(false)
  const [protractorStats, setProtractorStats] = useState<ProtractorStats>({
    angle: 45,
    rad: 0.785,
    supplementary: 135,
  })

  // ─── Compass State ───
  const [compassStats, setCompassStats] = useState<CompassStats>({
    heading: 0,
    direction: 'N',
  })

  // ─── StatsHeader Items Construction ───
  const statsHeaderElement = useMemo(() => {
    if (activeTab === 'level') {
      if (isEdgeView) {
        return (
          <StatsHeader
            items={[
              {
                key: 'angle',
                label: t.headers.angle,
                value: `${(levelStats.edgeAngle ?? 0).toFixed(1)}°`,
              },
              {
                key: 'slope',
                label: t.edge.slope,
                value: `${(levelStats.slopePercent ?? 0) >= 999 ? '∞' : `${(levelStats.slopePercent ?? 0).toFixed(1)}%`}`,
              },
              {
                key: 'status',
                label: t.headers.status,
                value: levelStats.isLevel ? t.headers.levelStatus : t.headers.tiltStatus,
              },
            ]}
          />
        )
      }

      return (
        <StatsHeader
          items={[
            {
              key: 'roll',
              label: t.headers.roll,
              value: `${levelStats.roll}°`,
            },
            {
              key: 'pitch',
              label: t.headers.pitch,
              value: `${levelStats.pitch}°`,
            },
            {
              key: 'status',
              label: t.headers.status,
              value: levelStats.isLevel ? t.headers.levelStatus : t.headers.tiltStatus,
            },
          ]}
        />
      )
    } else if (activeTab === 'protractor') {
      return (
        <StatsHeader
          items={[
            {
              key: 'angle',
              label: t.headers.angle,
              value: `${protractorStats.angle}°`,
            },
            {
              key: 'rad',
              label: t.headers.rad,
              value: protractorStats.rad.toFixed(3),
            },
            {
              key: 'suppl',
              label: t.headers.supplementary,
              value: `${protractorStats.supplementary}°`,
            },
          ]}
        />
      )
    } else {
      return (
        <StatsHeader
          items={[
            {
              key: 'heading',
              label: t.headers.heading,
              value: `${compassStats.heading}°`,
            },
            {
              key: 'dir',
              label: t.headers.direction,
              value: compassStats.direction,
            },
            {
              key: 'type',
              label: t.headers.type,
              value: t.headers.magnetic,
            },
          ]}
        />
      )
    }
  }, [activeTab, isEdgeView, levelStats, protractorStats, compassStats, t.headers, t.edge])

  // Sync to shell navbar if present
  useEffect(() => {
    setHeader?.(statsHeaderElement)
    return () => setHeader?.(null)
  }, [setHeader, statsHeaderElement])

  const tabOptions = useMemo(
    () => [
      { value: 'level' as const, label: t.tabs.level, id: 'tab-level' },
      { value: 'protractor' as const, label: t.tabs.protractor, id: 'tab-protractor' },
      { value: 'compass' as const, label: t.tabs.compass, id: 'tab-compass' },
    ],
    [t.tabs]
  )

  const viewModeOptions = useMemo(
    () => [
      { value: 'surface' as const, label: t.edge.surface2d, id: 'vmode-surface' },
      { value: 'edge' as const, label: t.edge.edgeRuler, id: 'vmode-edge' },
    ],
    [t.edge]
  )

  const toleranceOptions = useMemo(
    () => [
      { value: '0.2', label: t.settings.toleranceHigh, id: 'tol-02' },
      { value: '0.5', label: t.settings.toleranceNormal, id: 'tol-05' },
      { value: '1.0', label: t.settings.toleranceCoarse, id: 'tol-10' },
    ],
    [t.settings]
  )

  const calibrateLevel = () => {
    setCalibratedPitch(pitch)
    setCalibratedRoll(roll)
  }

  const resetLevelCalibration = () => {
    setCalibratedPitch(0)
    setCalibratedRoll(0)
  }

  return (
    <div className={`level-root ${isEink ? 'level-root--eink' : ''}`}>
      <BoardLayout
        variant="wide"
        align="center"
        allowDpadToggle={false}
        board={
          <div className="level-stage">
            {activeTab === 'level' && (
              <div className="level-view-mode-bar">
                <PillGroup
                  size="sm"
                  options={viewModeOptions}
                  value={levelViewMode}
                  onChange={(val) => setLevelViewMode(val as LevelViewMode)}
                />
              </div>
            )}
            <Card variant="outlined" padding="md" className="level-instrument-card">
              {activeTab === 'level' ? (
                isEdgeView ? (
                  <TubularLevel
                    locale={locale}
                    isEink={isEink}
                    calibratedPitch={calibratedPitch}
                    calibratedRoll={calibratedRoll}
                    pitch={pitch}
                    roll={roll}
                    setPitch={setPitch}
                    setRoll={setRoll}
                    tolerance={tolerance}
                    onEdgeStatsChange={handleEdgeStatsChange}
                  />
                ) : (
                  <BubbleLevel
                    locale={locale}
                    isEink={isEink}
                    onStatsChange={handleSurfaceStatsChange}
                    calibratedPitch={calibratedPitch}
                    calibratedRoll={calibratedRoll}
                    pitch={pitch}
                    roll={roll}
                    setPitch={setPitch}
                    setRoll={setRoll}
                    tolerance={tolerance}
                  />
                )
              ) : activeTab === 'protractor' ? (
                <Protractor
                  locale={locale}
                  isEink={isEink}
                  onStatsChange={(stats: ProtractorAngleResult) => setProtractorStats(stats)}
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
                  isEink={isEink}
                  isFrozen={isFrozen}
                  sensorPermissionGranted={sensorPermissionGranted}
                  onHeadingChange={(heading, direction) =>
                    setCompassStats({ heading, direction })
                  }
                />
              )}
            </Card>
          </div>
        }
        controls={
          <ControlsBar className="level-controls">
            {/* Functional buttons row above navigation */}
            <div className="level-controls-row">
              {activeTab === 'level' ? (
                <>
                  <Button
                    id="level-calibrate-btn"
                    variant="secondary"
                    size="sm"
                    onClick={calibrateLevel}
                  >
                    {t.controls.calibrate}
                  </Button>
                  {(calibratedPitch !== 0 || calibratedRoll !== 0) && (
                    <Button
                      id="level-reset-zero-btn"
                      variant="secondary"
                      size="sm"
                      icon={<RestartIcon />}
                      onClick={resetLevelCalibration}
                      title={t.controls.resetZero}
                    >
                      {t.controls.resetZero}
                    </Button>
                  )}
                </>
              ) : activeTab === 'protractor' ? (
                <>
                  <Button
                    id="protractor-freeze-btn"
                    variant={isFrozen ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setIsFrozen(!isFrozen)}
                  >
                    {isFrozen ? t.controls.unlock : t.controls.lock}
                  </Button>
                  <Button
                    id="protractor-reset-btn"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setArm1Angle(0)
                      setArm2Angle(45)
                      setIsFrozen(false)
                    }}
                  >
                    {t.controls.reset45}
                  </Button>
                </>
              ) : (
                <Button
                  id="compass-freeze-btn"
                  variant={isFrozen ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setIsFrozen(!isFrozen)}
                >
                  {isFrozen ? t.controls.unlock : t.controls.lock}
                </Button>
              )}

              {/* Tool & Sensor Settings Button */}
              <Button
                id="level-settings-btn"
                variant="secondary"
                size="sm"
                icon={<SettingsIcon />}
                onClick={() => setIsSettingsOpen(true)}
                title={t.controls.settings}
                aria-label={t.controls.settings}
              >
                {t.controls.settings}
              </Button>
            </div>

            {/* Mode Switcher Navigation Pills at the bottom */}
            <div className="level-controls-nav">
              <PillGroup
                size="sm"
                options={tabOptions}
                value={activeTab}
                onChange={(newTab) => {
                  setActiveTab(newTab)
                  setIsFrozen(false)
                }}
              />
            </div>
          </ControlsBar>
        }
      />

      {/* Sensor & Tool Settings Dialog */}
      <Dialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={t.settings.title}
        maxWidth="sm"
      >
        <div className="level-dialog-content">
          {/* Level Sensitivity / Tolerance */}
          <SettingsGroup label={`${t.settings.sensitivity} (${tolerance}°)`}>
            <div style={{ display: 'flex', gap: 'var(--all-space-2, 0.5rem)', width: '100%' }}>
              <Button
                variant={tolerance === 0.2 ? 'primary' : 'secondary'}
                size="sm"
                fullWidth
                onClick={() => setTolerance(0.2)}
              >
                {t.settings.toleranceHigh}
              </Button>
              <Button
                variant={tolerance === 0.5 ? 'primary' : 'secondary'}
                size="sm"
                fullWidth
                onClick={() => setTolerance(0.5)}
              >
                {t.settings.toleranceNormal}
              </Button>
              <Button
                variant={tolerance === 1.0 ? 'primary' : 'secondary'}
                size="sm"
                fullWidth
                onClick={() => setTolerance(1.0)}
              >
                {t.settings.toleranceCoarse}
              </Button>
            </div>
          </SettingsGroup>
          <p className="level-dialog-hint">{t.settings.sensitivityDesc}</p>
          <p className="level-dialog-help-text">
            {tolerance <= 0.2
              ? t.settings.tolerancePrecisionHelp
              : tolerance <= 0.5
              ? t.settings.toleranceNormalHelp
              : t.settings.toleranceCoarseHelp}
          </p>

          {/* Zero Level Calibration */}
          <SettingsGroup label={t.settings.calibration}>
            <div style={{ display: 'flex', gap: 'var(--all-space-2, 0.5rem)', width: '100%' }}>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={calibrateLevel}
              >
                {t.controls.calibrate}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                icon={<RestartIcon />}
                onClick={resetLevelCalibration}
                disabled={calibratedPitch === 0 && calibratedRoll === 0}
              >
                {t.controls.resetZero}
              </Button>
            </div>
          </SettingsGroup>
          <p className="level-dialog-hint">{t.settings.calibrationDesc}</p>
          {(calibratedPitch !== 0 || calibratedRoll !== 0) && (
            <p className="level-dialog-help-text">
              {t.settings.offsetLabel}: Pitch {calibratedPitch.toFixed(1)}° · Roll {calibratedRoll.toFixed(1)}°
            </p>
          )}

          {/* Device Sensors & Permissions (for iOS Safari) */}
          {requiresOrientationPermission() && (
            <>
              <SettingsGroup label={t.permission.title}>
                <div style={{ display: 'flex', width: '100%' }}>
                  <Button
                    variant={sensorPermissionGranted ? 'secondary' : 'primary'}
                    size="sm"
                    fullWidth
                    disabled={sensorPermissionGranted}
                    onClick={async () => {
                      const res = await requestOrientationPermission()
                      if (res === 'granted') {
                        setSensorPermissionGranted(true)
                      }
                    }}
                  >
                    {sensorPermissionGranted
                      ? '✓ ' + t.permission.grantButton
                      : t.permission.grantButton}
                  </Button>
                </div>
              </SettingsGroup>
              <p className="level-dialog-hint">{t.permission.description}</p>
            </>
          )}

          <div className="level-dialog-footer">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTolerance(0.5)
                resetLevelCalibration()
              }}
            >
              {t.settings.resetDefaults}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
            >
              {t.settings.close}
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  )
}

export default LevelProtractor

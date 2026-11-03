import { useMemo, useState } from "react"

type Range = "1시간" | "6시간" | "24시간"

type SensorPoint = {
  label: string
  value: number
}

const SENSOR_DATA: Record<Range, SensorPoint[]> = {
  "1시간": [
    { label: "14:00", value: 42 },
    { label: "14:10", value: 47 },
    { label: "14:20", value: 45 },
    { label: "14:30", value: 58 },
    { label: "14:40", value: 63 },
    { label: "14:50", value: 68 },
    { label: "15:00", value: 72 },
  ],
  "6시간": [
    { label: "09:00", value: 30 },
    { label: "10:00", value: 44 },
    { label: "11:00", value: 41 },
    { label: "12:00", value: 55 },
    { label: "13:00", value: 49 },
    { label: "14:00", value: 64 },
    { label: "15:00", value: 72 },
  ],
  "24시간": [
    { label: "어제 15시", value: 48 },
    { label: "19:00", value: 39 },
    { label: "23:00", value: 52 },
    { label: "03:00", value: 34 },
    { label: "07:00", value: 45 },
    { label: "11:00", value: 61 },
    { label: "15:00", value: 72 },
  ],
}

const RANGE_LABELS: Range[] = ["1시간", "6시간", "24시간"]
const CHART_WIDTH = 900
const CHART_HEIGHT = 300
const CHART_PADDING = { top: 22, right: 22, bottom: 42, left: 46 }

function SensorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 12.25a3.5 3.5 0 1 0 7 0v-6a3.5 3.5 0 1 0-7 0v6Z" />
      <path d="M12 15.75v3.75m-3 0h6M6 12.25a6 6 0 0 0 12 0" />
    </svg>
  )
}

function TrendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 16.5 9 11l3.5 3.5L20 7" />
      <path d="M15 7h5v5" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="12" cy="12" r="1.25" />
      <circle cx="19" cy="12" r="1.25" />
    </svg>
  )
}

function LineChart({ points }: { points: SensorPoint[] }) {
  const minValue = 0
  const maxValue = 100
  const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
  const gridValues = [100, 75, 50, 25, 0]

  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      CHART_PADDING.left +
      (index / Math.max(points.length - 1, 1)) * innerWidth,
    y:
      CHART_PADDING.top +
      ((maxValue - point.value) / (maxValue - minValue)) * innerHeight,
  }))

  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const areaPath = `${linePath} L ${coordinates.at(-1)?.x} ${
    CHART_PADDING.top + innerHeight
  } L ${coordinates[0].x} ${CHART_PADDING.top + innerHeight} Z`

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="선택한 기간의 터치 센서값 변화 선 그래프"
      >
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b5bd6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#5b5bd6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridValues.map((value) => {
          const y =
            CHART_PADDING.top +
            ((maxValue - value) / (maxValue - minValue)) * innerHeight
          return (
            <g key={value}>
              <line
                x1={CHART_PADDING.left}
                x2={CHART_WIDTH - CHART_PADDING.right}
                y1={y}
                y2={y}
                className="chart-grid"
              />
              <text x={10} y={y + 4} className="chart-label">
                {value}
              </text>
            </g>
          )
        })}

        <path d={areaPath} fill="url(#area-gradient)" />
        <path d={linePath} className="chart-line" />

        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            {index === coordinates.length - 1 && (
              <circle
                cx={point.x}
                cy={point.y}
                r="9"
                className="chart-point-halo"
              />
            )}
            <circle
              cx={point.x}
              cy={point.y}
              r={index === coordinates.length - 1 ? 5 : 3.5}
              className="chart-point"
            />
            <text
              x={point.x}
              y={CHART_HEIGHT - 12}
              textAnchor={
                index === 0
                  ? "start"
                  : index === coordinates.length - 1
                    ? "end"
                    : "middle"
              }
              className="chart-label"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function App() {
  const [range, setRange] = useState<Range>("1시간")
  const points = SENSOR_DATA[range]
  const latestValue = points.at(-1)?.value ?? 0

  const stats = useMemo(() => {
    const values = points.map((point) => point.value)
    const average = Math.round(
      values.reduce((total, value) => total + value, 0) / values.length,
    )
    return {
      average,
      highest: Math.max(...values),
      lowest: Math.min(...values),
    }
  }, [points])

  return (
    <main className="app-shell">
      <header className="topbar">
        <a href="#" className="brand" aria-label="Touchboard 홈">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>Touchboard</span>
        </a>
        <div className="header-status">
          <span className="live-dot" />
          <span>센서 연결됨</span>
          <span className="header-divider" />
          <div className="avatar">YK</div>
        </div>
      </header>

      <div className="page">
        <section className="page-heading">
          <div>
            <p className="eyebrow">SENSOR MONITOR</p>
            <h1>터치 센서 대시보드</h1>
            <p className="heading-copy">
              센서의 현재 상태와 시간에 따른 변화를 확인하세요.
            </p>
          </div>
          <div className="updated-time">
            <span>마지막 업데이트</span>
            <strong>오늘 15:00:24</strong>
          </div>
        </section>

        <section className="dashboard-grid" aria-label="센서 요약">
          <article className="card current-card">
            <div className="card-top">
              <div className="card-title">
                <span className="icon-box">
                  <SensorIcon />
                </span>
                <div>
                  <p>현재 센서값</p>
                  <span>Touch Sensor 01</span>
                </div>
              </div>
              <span className="status-pill">
                <span />
                정상
              </span>
            </div>

            <div className="sensor-reading">
              <strong>{latestValue}</strong>
              <span>%</span>
            </div>
            <div className="progress-track" aria-hidden="true">
              <div style={{ width: `${latestValue}%` }} />
            </div>
            <div className="range-labels">
              <span>0</span>
              <span>센서 감도</span>
              <span>100</span>
            </div>

            <div className="reading-footer">
              <span className="trend-badge">
                <TrendIcon />
                +6.2%
              </span>
              <span>10분 전보다 상승</span>
            </div>
          </article>

          <article className="card overview-card">
            <div className="card-top">
              <div>
                <p className="section-title">오늘의 요약</p>
                <span className="section-subtitle">선택한 기간 기준</span>
              </div>
              <button className="icon-button" type="button" aria-label="더보기">
                <MoreIcon />
              </button>
            </div>
            <dl className="stats-list">
              <div>
                <dt>평균값</dt>
                <dd>
                  {stats.average}
                  <span>%</span>
                </dd>
              </div>
              <div>
                <dt>최고값</dt>
                <dd>
                  {stats.highest}
                  <span>%</span>
                </dd>
              </div>
              <div>
                <dt>최저값</dt>
                <dd>
                  {stats.lowest}
                  <span>%</span>
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section className="card chart-card">
          <div className="chart-header">
            <div>
              <p className="section-title">시간별 센서 변화</p>
              <span className="section-subtitle">
                센서값이 시간에 따라 어떻게 변했는지 확인하세요.
              </span>
            </div>
            <div className="range-tabs" aria-label="조회 기간">
              {RANGE_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={range === label ? "active" : ""}
                  onClick={() => setRange(label)}
                  aria-pressed={range === label}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-meta">
            <div>
              <span className="legend-dot" />
              센서값
            </div>
            <p>
              현재 <strong>{latestValue}%</strong>
            </p>
          </div>
          <LineChart points={points} />
        </section>
      </div>
    </main>
  )
}

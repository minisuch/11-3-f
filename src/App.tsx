import { useMemo, useRef, useState } from "react"

type Range = "1시간" | "6시간" | "24시간"

type SensorPoint = {
  label: string
  value: 0 | 1
}

const SENSOR_DATA: Record<Range, SensorPoint[]> = {
  "1시간": [
    { label: "14:00", value: 0 },
    { label: "14:10", value: 1 },
    { label: "14:20", value: 1 },
    { label: "14:30", value: 0 },
    { label: "14:40", value: 1 },
    { label: "14:50", value: 0 },
    { label: "15:00", value: 1 },
  ],
  "6시간": [
    { label: "09:00", value: 0 },
    { label: "10:00", value: 0 },
    { label: "11:00", value: 1 },
    { label: "12:00", value: 1 },
    { label: "13:00", value: 0 },
    { label: "14:00", value: 1 },
    { label: "15:00", value: 1 },
  ],
  "24시간": [
    { label: "어제 15시", value: 1 },
    { label: "19:00", value: 0 },
    { label: "23:00", value: 0 },
    { label: "03:00", value: 1 },
    { label: "07:00", value: 0 },
    { label: "11:00", value: 1 },
    { label: "15:00", value: 1 },
  ],
}

const RANGE_LABELS: Range[] = ["1시간", "6시간", "24시간"]
const CHART_WIDTH = 900
const CHART_HEIGHT = 300
const CHART_PADDING = { top: 22, right: 22, bottom: 42, left: 46 }

type SerialPort = {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
}

type WebSerial = {
  requestPort(): Promise<SerialPort>
}

function SensorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.5 12.25a3.5 3.5 0 1 0 7 0v-6a3.5 3.5 0 1 0-7 0v6Z" />
      <path d="M12 15.75v3.75m-3 0h6M6 12.25a6 6 0 0 0 12 0" />
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
  const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
  const gridValues = [1, 0] as const
  const labelInterval = Math.max(1, Math.ceil((points.length - 1) / 5))

  const coordinates = points.map((point, index) => ({
    ...point,
    x:
      CHART_PADDING.left +
      (index / Math.max(points.length - 1, 1)) * innerWidth,
    y: CHART_PADDING.top + (1 - point.value) * innerHeight,
  }))

  const linePath = coordinates.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    return `${path} H ${point.x} V ${point.y}`
  }, "")

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="선택한 기간의 디지털 센서 상태 변화 계단 그래프"
      >
        {gridValues.map((value) => {
          const y = CHART_PADDING.top + (1 - value) * innerHeight
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
                {value === 1 ? "1=ON" : "0=OFF"}
              </text>
            </g>
          )
        })}

        <path d={linePath} className="chart-line" />

        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            {index === coordinates.length - 1 && coordinates.length > 0 && (
              <circle
                cx={point.x}
                cy={point.y}
                r="9"
                className="chart-point-halo"
              />
            )}
            {index === coordinates.length - 1 && (
              <circle cx={point.x} cy={point.y} r={5} className="chart-point" />
            )}
            {(index % labelInterval === 0 ||
              index === coordinates.length - 1) && (
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
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function App() {
  const [range, setRange] = useState<Range>("1시간")
  const [livePoints, setLivePoints] = useState<SensorPoint[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const portRef = useRef<SerialPort | null>(null)
  const disconnectRequestedRef = useRef(false)
  const points =
    isConnected || livePoints.length > 0 ? livePoints : SENSOR_DATA[range]
  const latestValue = isConnected
    ? livePoints.at(-1)?.value
    : points.at(-1)?.value

  const stats = useMemo(() => {
    const onCount = points.filter((point) => point.value === 1).length
    return {
      onCount,
      offCount: points.length - onCount,
      total: points.length,
    }
  }, [points])

  const disconnectSerial = async () => {
    disconnectRequestedRef.current = true
    setConnectionError("")
    setIsConnected(false)
    const reader = readerRef.current
    if (reader) {
      try {
        await reader.cancel()
      } catch (error) {
        setConnectionError(
          error instanceof Error
            ? error.message
            : "시리얼 연결을 해제하지 못했습니다.",
        )
      }
      return
    }

    const port = portRef.current
    if (port) {
      try {
        await port.close()
        portRef.current = null
      } catch (error) {
        setConnectionError(
          error instanceof Error
            ? error.message
            : "시리얼 연결을 해제하지 못했습니다.",
        )
      }
    }
    disconnectRequestedRef.current = false
  }

  const connectSerial = async () => {
    const serial = (navigator as Navigator & { serial?: WebSerial }).serial
    if (!serial) {
      setConnectionError(
        "이 브라우저는 Web Serial API를 지원하지 않습니다. Chrome 또는 Edge를 사용해 주세요.",
      )
      return
    }

    setConnectionError("")
    setIsConnecting(true)
    disconnectRequestedRef.current = false
    let port: SerialPort | null = null

    try {
      port = await serial.requestPort()
      await port.open({ baudRate: 9600 })
      portRef.current = port
      if (!port.readable) {
        throw new Error("선택한 시리얼 포트에서 데이터를 읽을 수 없습니다.")
      }

      const reader = port.readable.getReader()
      readerRef.current = reader
      setLivePoints([])
      setIsConnected(true)
      const decoder = new TextDecoder()
      let buffer = ""

      const appendLine = (line: string) => {
        const text = line.trim()
        if (!text) return
        if (text !== "0" && text !== "1") {
          setConnectionError(`0 또는 1이 아닌 데이터는 건너뜁니다: ${text}`)
          return
        }
        const value: 0 | 1 = text === "1" ? 1 : 0
        setConnectionError("")
        setLastUpdated(new Date())
        const label = new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        setLivePoints((current) => [...current, { label, value }].slice(-100))
      }

      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value, { stream: !done })
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ""
        lines.forEach(appendLine)
        if (done) {
          appendLine(buffer)
          break
        }
      }
    } catch (error) {
      if (
        !disconnectRequestedRef.current &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setConnectionError(
          error instanceof Error
            ? error.message
            : "시리얼 포트에 연결하지 못했습니다.",
        )
      }
    } finally {
      readerRef.current?.releaseLock()
      readerRef.current = null
      if (port) {
        try {
          await port.close()
        } catch (error) {
          if (!disconnectRequestedRef.current) {
            setConnectionError(
              error instanceof Error
                ? error.message
                : "시리얼 포트를 닫지 못했습니다.",
            )
          }
        }
      }
      portRef.current = null
      setIsConnected(false)
      setIsConnecting(false)
      disconnectRequestedRef.current = false
    }
  }

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
          <span className={`live-dot ${isConnected ? "connected" : ""}`} />
          <span>{isConnected ? "센서 연결됨" : "센서 연결 안 됨"}</span>
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
              디지털 센서의 현재 상태와 시간에 따른 변화를 확인하세요.
            </p>
          </div>
          <div className="heading-actions">
            <div className="updated-time">
              <span>마지막 업데이트</span>
              <strong>
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString("ko-KR")
                  : "수신 대기 중"}
              </strong>
            </div>
            <button
              className="serial-button"
              type="button"
              onClick={isConnected ? disconnectSerial : connectSerial}
              disabled={isConnecting}
            >
              {isConnecting
                ? "연결 중..."
                : isConnected
                  ? "연결 해제"
                  : "시리얼 연결"}
            </button>
          </div>
        </section>
        {connectionError && (
          <p className="connection-error" role="status">
            {connectionError}
          </p>
        )}

        <section className="dashboard-grid" aria-label="센서 요약">
          <article className="card current-card">
            <div className="card-top">
              <div className="card-title">
                <span className="icon-box">
                  <SensorIcon />
                </span>
                <div>
                  <p>현재 센서 상태</p>
                  <span>Touch Sensor 01</span>
                </div>
              </div>
              <span
                className={`status-pill ${isConnected ? "" : "disconnected"}`}
              >
                <span />
                {isConnected ? "수신 중" : "대기 중"}
              </span>
            </div>

            <div className="sensor-reading">
              <span
                className={`sensor-led ${latestValue === 1 ? "on" : ""}`}
                aria-hidden="true"
              />
              <strong>
                {latestValue === undefined
                  ? "수신 대기 중"
                  : latestValue === 1
                    ? "ON(1)"
                    : "OFF(0)"}
              </strong>
            </div>

            <div className="reading-footer">
              {livePoints.length > 0 ? (
                <span>
                  최근 {livePoints.length}개 값이 브라우저에만 표시됩니다.
                </span>
              ) : isConnected ? (
                <span>시리얼 데이터 수신 대기 중</span>
              ) : (
                <span>디지털 센서 상태</span>
              )}
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
                <dt>ON 기록</dt>
                <dd>{stats.onCount}</dd>
              </div>
              <div>
                <dt>OFF 기록</dt>
                <dd>{stats.offCount}</dd>
              </div>
              <div>
                <dt>전체 기록</dt>
                <dd>{stats.total}</dd>
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
            {livePoints.length > 0 ? (
              <span className="live-range">최근 {livePoints.length}개</span>
            ) : (
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
            )}
          </div>

          <div className="chart-meta">
            <div>
              <span className="legend-dot" />
              센서값
            </div>
            <p>
              현재{" "}
              <strong>
                {latestValue === undefined
                  ? "수신 대기 중"
                  : latestValue === 1
                    ? "ON"
                    : "OFF"}
              </strong>
            </p>
          </div>
          <LineChart points={points} />
        </section>
      </div>
    </main>
  )
}

import { useEffect, useRef, useState } from "react"
import type { Reading } from "../lib/device"
import { SENSOR_MAX, SENSOR_MIN } from "../product"

type Props = {
  readings: Reading[]
}

const CHART_HEIGHT = 200
const PADDING = { left: 40, right: 8, top: 8, bottom: 20 }

export default function SensorChart({ readings }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const innerWidth = Math.max(0, width - PADDING.left - PADDING.right)
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const points = readings
    .map((reading, index) => {
      const x =
        PADDING.left +
        (readings.length < 2
          ? innerWidth
          : (index / (readings.length - 1)) * innerWidth)
      const normalized = Math.min(
        1,
        Math.max(0, (reading.value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)),
      )
      const y = PADDING.top + (1 - normalized) * innerHeight
      return `${x},${y}`
    })
    .join(" ")
  const currentValue = readings.at(-1)?.value

  return (
    <section
      className="chart-section"
      aria-label="실시간 센서값"
      ref={containerRef}
    >
      {readings.length === 0 ? (
        <p className="t-body empty-chart">
          센서를 연결하면 값이 여기에 그려집니다.
        </p>
      ) : (
        <svg
          className="sensor-chart"
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          role="img"
          aria-label={`센서값 추이, 현재 ${currentValue?.toLocaleString("ko-KR")}`}
        >
          {[SENSOR_MAX, (SENSOR_MAX + SENSOR_MIN) / 2, SENSOR_MIN].map(
            (value, index) => {
              const y = PADDING.top + (index / 2) * innerHeight
              return (
                <g key={value}>
                  <line
                    className="chart-grid"
                    x1={PADDING.left}
                    x2={width - PADDING.right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="chart-label"
                    x={PADDING.left - PADDING.right}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                  >
                    {Math.round(value).toLocaleString("ko-KR")}
                  </text>
                </g>
              )
            },
          )}
          <polyline className="chart-line" points={points} />
          <text
            className="chart-label"
            x={PADDING.left}
            y={CHART_HEIGHT - PADDING.right}
            textAnchor="start"
          >
            −60s
          </text>
          <text
            className="chart-label"
            x={width - PADDING.right}
            y={CHART_HEIGHT - PADDING.right}
            textAnchor="end"
          >
            지금
          </text>
        </svg>
      )}
    </section>
  )
}

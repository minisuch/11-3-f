import type { CSSProperties } from "react"
import { SENSOR_MAX, SENSOR_MIN } from "../product"

type Props = {
  value: number | undefined
  power: boolean
}

type VisualStyle = CSSProperties & {
  "--level": number
  "--shift-x": string
  "--shift-y": string
  "--visual-scale": number
}

export default function SensorMoon({ value, power }: Props) {
  const level =
    value === undefined
      ? 0
      : Math.min(
          1,
          Math.max(0, (value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)),
        )
  const brightness = Math.round(level * 100)
  const label = power
    ? `조명 이미지 밝기 ${brightness}%`
    : "조명 이미지 꺼짐"
  const visualStyle = {
    "--level": level,
    "--shift-x": `${(0.5 - level) * 12}%`,
    "--shift-y": `${(0.5 - level) * -16}%`,
    "--visual-scale": 1.22 + level * 0.08,
  } as VisualStyle

  return (
    <section className="moon-section" aria-label="조명 상태">
      <div
        className="light-visual"
        data-power={power ? "on" : "off"}
        style={visualStyle}
        role="img"
        aria-label={label}
      >
        <img src="/images/light-wallpaper.webp" alt="" />
      </div>
      <p className="t-value sensor-value">
        {value === undefined ? "—" : value.toLocaleString("ko-KR")}
      </p>
    </section>
  )
}

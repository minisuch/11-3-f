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
  "--shape-x": string
  "--shape-y": string
  "--shape-rx": string
  "--shape-ry": string
  "--shape-shift-x": string
  "--shape-shift-y": string
  "--shape-scale": number
}

export default function SensorMoon({ value, power }: Props) {
  const wallpaperSrc = `${import.meta.env.BASE_URL}images/light-wallpaper.webp`
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
    "--shape-x": `${38 + level * 24}%`,
    "--shape-y": `${60 - level * 20}%`,
    "--shape-rx": `${30 + level * 8}%`,
    "--shape-ry": `${44 - level * 6}%`,
    "--shape-shift-x": `${(level - 0.5) * 6}%`,
    "--shape-shift-y": `${(0.5 - level) * 8}%`,
    "--shape-scale": 1.26 - level * 0.04,
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
        <img
          className="light-layer light-layer-base"
          src={wallpaperSrc}
          alt=""
        />
        <img
          className="light-layer light-layer-shape"
          src={wallpaperSrc}
          alt=""
        />
      </div>
    </section>
  )
}

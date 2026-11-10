import { useState } from "react"

type Props = {
  power: boolean
  onChange: (nextPower: boolean) => Promise<boolean>
}

export default function PowerToggle({ power, onChange }: Props) {
  const [hasError, setHasError] = useState(false)

  const togglePower = async () => {
    setHasError(false)
    const succeeded = await onChange(!power)
    setHasError(!succeeded)
  }

  return (
    <div className="power-control">
      <div className="control-row">
        <div>
          <p className="t-label control-name">LED 전원</p>
          <p className="t-caption power-status">{power ? "켜짐" : "꺼짐"}</p>
        </div>
        <button
          className="power-switch"
          type="button"
          role="switch"
          aria-checked={power}
          aria-label="LED 전원"
          onClick={() => void togglePower()}
        >
          <span className="switch-track">
            <span className="switch-handle" />
          </span>
        </button>
      </div>
      {hasError && (
        <p className="t-caption power-error" role="alert">
          전원 변경 실패, 다시 시도
        </p>
      )}
    </div>
  )
}

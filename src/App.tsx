import { useCallback, useEffect, useState } from "react"
import ConnectionControl from "./components/ConnectionControl"
import PowerToggle from "./components/PowerToggle"
import ProductHeader from "./components/ProductHeader"
import SensorChart from "./components/SensorChart"
import SensorMoon from "./components/SensorMoon"
import {
  connectSensor,
  disconnectSensor,
  loadPower,
  setLedPower,
  type Reading,
  type Status,
} from "./lib/device"
import { MAX_POINTS } from "./product"

export default function App() {
  const [status, setStatus] = useState<Status>("disconnected")
  const [power, setPower] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])
  const [isChartVisible, setIsChartVisible] = useState(true)

  useEffect(() => {
    void loadPower().then(setPower)
    return () => {
      void disconnectSensor()
    }
  }, [])

  const handleConnection = useCallback(async () => {
    if (status === "connected") {
      await disconnectSensor()
      setStatus("disconnected")
      return
    }

    await connectSensor({
      onInit: (rows) => setReadings(rows.slice(-MAX_POINTS)),
      onReading: (row) =>
        setReadings((current) => [...current, row].slice(-MAX_POINTS)),
      onStatus: setStatus,
    })
  }, [status])

  const handlePowerChange = useCallback(async (nextPower: boolean) => {
    setPower(nextPower)
    const succeeded = await setLedPower(nextPower)
    if (!succeeded) setPower((current) => !current)
    return succeeded
  }, [])

  return (
    <main className="app-shell">
      <ProductHeader />
      <SensorMoon value={readings.at(-1)?.value} power={power} />
      <div className="data-grid">
        <section className="controls" aria-label="조명 제어">
          <div className="control-columns">
            <div className="sensor-control-stack">
              <ConnectionControl status={status} onToggle={handleConnection} />
              <div className="control-row">
                <div>
                  <p className="t-label control-name">그래프</p>
                  <p className="t-caption power-status">
                    {isChartVisible ? "표시 중" : "숨김"}
                  </p>
                </div>
                <button
                  className="t-label action-button"
                  type="button"
                  aria-controls="sensor-chart"
                  aria-expanded={isChartVisible}
                  onClick={() => setIsChartVisible((visible) => !visible)}
                >
                  <span className="action-button-label">
                    {isChartVisible ? "숨기기" : "보기"}
                  </span>
                </button>
              </div>
            </div>
            <PowerToggle power={power} onChange={handlePowerChange} />
          </div>
        </section>
        <div
          className="chart-container"
          id="sensor-chart"
          hidden={!isChartVisible}
        >
          <SensorChart readings={readings} />
        </div>
      </div>
    </main>
  )
}

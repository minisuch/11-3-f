import type { RealtimeChannel } from "@supabase/supabase-js"
import { DEVICE_ID, MAX_POINTS, SENSOR_MAX, SENSOR_MIN } from "../product"
import { db, IS_DEMO } from "./supabase"

export type Reading = {
  value: number
  created_at: string
}
export type Status = "disconnected" | "connecting" | "connected" | "error"

type ConnectOptions = {
  onInit: (rows: Reading[]) => void
  onReading: (row: Reading) => void
  onStatus: (status: Status) => void
}

let channel: RealtimeChannel | null = null
let demoTimer: ReturnType<typeof setInterval> | null = null
let demoPower = false
let demoPhase = 0

function createDemoReading(createdAt = new Date()): Reading {
  const normalized = (Math.sin(demoPhase) + 1) / 2
  demoPhase += 0.28
  return {
    value: Math.round(SENSOR_MIN + normalized * (SENSOR_MAX - SENSOR_MIN)),
    created_at: createdAt.toISOString(),
  }
}

export async function connectSensor({
  onInit,
  onReading,
  onStatus,
}: ConnectOptions): Promise<void> {
  await disconnectSensor()
  onStatus("connecting")

  if (IS_DEMO) {
    const now = Date.now()
    const initialRows = Array.from({ length: 24 }, (_, index) =>
      createDemoReading(new Date(now - (23 - index) * 500)),
    )
    onInit(initialRows)
    onStatus("connected")
    demoTimer = setInterval(() => onReading(createDemoReading()), 500)
    return
  }

  const { data, error } = await db
    .from("sensor_readings")
    .select("value, created_at")
    .eq("device_id", DEVICE_ID)
    .order("created_at", { ascending: false })
    .limit(MAX_POINTS)

  if (error) {
    onStatus("error")
    return
  }

  onInit((data as Reading[]).reverse())
  channel = db
    .channel(`sensor-${DEVICE_ID}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sensor_readings",
        filter: `device_id=eq.${DEVICE_ID}`,
      },
      (payload) => onReading(payload.new as Reading),
    )
    .subscribe((subscriptionStatus) => {
      if (subscriptionStatus === "SUBSCRIBED") onStatus("connected")
      if (
        subscriptionStatus === "CHANNEL_ERROR" ||
        subscriptionStatus === "TIMED_OUT"
      ) {
        onStatus("error")
      }
    })
}

export async function disconnectSensor(): Promise<void> {
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }
  if (channel) {
    await db.removeChannel(channel)
    channel = null
  }
}

export async function setLedPower(on: boolean): Promise<boolean> {
  if (IS_DEMO) {
    demoPower = on
    return true
  }

  const { error } = await db
    .from("device_state")
    .update({ led_on: on, updated_at: new Date().toISOString() })
    .eq("device_id", DEVICE_ID)
  return !error
}

export async function loadPower(): Promise<boolean> {
  if (IS_DEMO) return demoPower

  const { data, error } = await db
    .from("device_state")
    .select("led_on")
    .eq("device_id", DEVICE_ID)
    .maybeSingle()
  return error ? false : Boolean(data?.led_on)
}

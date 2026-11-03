import argparse
import logging
import os
import time
from pathlib import Path

import serial
from dotenv import load_dotenv
from supabase import Client, create_client

BAUD_RATE = 9600
SERIAL_READ_TIMEOUT = 0.1
UPLOAD_INTERVAL = 1.0


def create_supabase_client():
    load_dotenv(Path(__file__).with_name(".env"), override=True)
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("VITE_SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError(
            ".env에 VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY를 설정하세요."
        )
    return create_client(url, key)


def upload_readings(port_name: str, supabase_client: Client) -> None:
    latest_value: int | None = None
    line_buffer = bytearray()
    next_upload_at = time.monotonic() + UPLOAD_INTERVAL

    with serial.Serial(
        port_name,
        BAUD_RATE,
        timeout=SERIAL_READ_TIMEOUT,
    ) as arduino:
        logging.info("시리얼 포트 %s에 %d baud로 연결했습니다.", port_name, BAUD_RATE)
        while True:
            line_buffer.extend(arduino.readline())
            while b"\n" in line_buffer:
                line, _, remainder = line_buffer.partition(b"\n")
                line_buffer = bytearray(remainder)
                try:
                    text = line.decode("utf-8").strip()
                except UnicodeDecodeError:
                    logging.warning("UTF-8 형식이 아닌 시리얼 데이터는 건너뜁니다.")
                    continue

                if text not in {"0", "1"}:
                    logging.warning("0 또는 1이 아닌 데이터는 건너뜁니다: %r", text)
                    continue

                latest_value = int(text)

            now = time.monotonic()
            if now >= next_upload_at:
                if latest_value is not None:
                    supabase_client.table("readings").insert(
                        {"value": latest_value}
                    ).execute()
                    logging.info(
                        "readings 테이블에 value=%d를 저장했습니다.",
                        latest_value,
                    )

                now = time.monotonic()
                elapsed_periods = max(
                    1,
                    int((now - next_upload_at) // UPLOAD_INTERVAL) + 1,
                )
                next_upload_at += elapsed_periods * UPLOAD_INTERVAL


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Arduino의 디지털 시리얼 값을 Supabase readings 테이블에 업로드합니다."
    )
    parser.add_argument(
        "port",
        nargs="?",
        default="/dev/cu.usbmodem21301",
        help="Arduino 시리얼 포트 (예: /dev/cu.usbmodem1101 또는 COM3)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    client = create_supabase_client()
    try:
        upload_readings(args.port, client)
    except KeyboardInterrupt:
        logging.info("사용자 요청으로 업로드를 종료합니다.")


if __name__ == "__main__":
    main()

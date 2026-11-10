import { useEffect } from "react"
import { IS_DEMO } from "../lib/supabase"
import { PRODUCT } from "../product"

const placeholders = {
  name: "[제품 이름]",
  description: "[제품 설명, 2~3문장]",
}

export default function ProductHeader() {
  useEffect(() => {
    document.title = PRODUCT.name || placeholders.name
  }, [])

  return (
    <header className="product-header">
      <h1 className={`t-display ${PRODUCT.name ? "" : "placeholder"}`}>
        {PRODUCT.name || placeholders.name}
      </h1>
      {PRODUCT.concept && <p className="t-label concept">{PRODUCT.concept}</p>}
      <p
        className={`t-body description ${
          PRODUCT.description ? "" : "placeholder"
        }`}
      >
        {PRODUCT.description || placeholders.description}
      </p>
      {IS_DEMO && <p className="t-caption demo-note">데모 데이터로 표시 중</p>}
    </header>
  )
}

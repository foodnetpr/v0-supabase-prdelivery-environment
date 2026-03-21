"use client"

import { useEffect } from "react"

declare const fbq: Function

export function FBViewContent() {
  useEffect(() => {
    if (typeof fbq !== "undefined") {
      fbq("track", "ViewContent")
    }
  }, [])

  return null
}

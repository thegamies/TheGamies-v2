import type { CSSProperties } from "react";

/** Inset remove control: gray translucent fill, black ✕, border. */
export const cardRemoveButtonStyle: CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 2,
  width: 28,
  height: 28,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background: "rgba(128, 128, 128, 0.55)",
  color: "#000",
  border: "1.5px solid rgba(0, 0, 0, 0.35)",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  padding: 0,
};

/** Center drag handle so mobile doesn't start a drag from the cover. */
export const cardMoveButtonStyle: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  zIndex: 2,
  transform: "translate(-50%, -50%)",
  width: 40,
  height: 40,
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background: "rgba(128, 128, 128, 0.55)",
  color: "#000",
  border: "1.5px solid rgba(0, 0, 0, 0.35)",
  cursor: "grab",
  fontSize: 18,
  lineHeight: 1,
  padding: 0,
  touchAction: "none",
};

export const cardRemoveButtonClassName =
  "absolute top-2 right-2 z-[2] grid h-7 w-7 place-items-center rounded-full border-[1.5px] border-black/35 text-sm font-bold leading-none text-black [background:rgba(128,128,128,0.55)]";

export const cardMoveButtonClassName =
  "absolute top-1/2 left-1/2 z-[2] grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[1.5px] border-black/35 text-lg leading-none text-black [background:rgba(128,128,128,0.55)] cursor-grab touch-none active:cursor-grabbing";

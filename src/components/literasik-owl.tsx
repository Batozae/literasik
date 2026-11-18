"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type OwlMood =
  | "idle"
  | "happy"
  | "celebrate"
  | "encourage"
  | "focused"
  | "shy"
  | "peek";

const SIZE_CLASSES = {
  sm: "h-11 w-11",
  md: "h-16 w-16",
  lg: "h-24 w-24",
  xl: "h-28 w-28",
} as const;

export function LiterasikOwl({
  mood = "idle",
  size = "lg",
  interactive = true,
  withBackdrop = false,
  hangSide,
  waving = false,
  className,
}: {
  mood?: OwlMood;
  size?: keyof typeof SIZE_CLASSES;
  interactive?: boolean;
  withBackdrop?: boolean;
  hangSide?: "right";
  waving?: boolean;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [gaze, setGaze] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [clickedExcited, setClickedExcited] = useState(false);
  const [hovered, setHovered] = useState(false);

  const effectiveMood: OwlMood = clickedExcited
    ? "celebrate"
    : hovered && mood === "idle"
      ? "happy"
      : mood;

  // Eye-tracking mengikuti kursor secara halus
  useEffect(() => {
    if (!interactive) return;

    let frameId = 0;
    function handlePointerMove(e: PointerEvent) {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const el = svgRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.42;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const maxOffset = 5.5;
        const factor = Math.min(1, dist / 220);
        setGaze({
          x: Number(((dx / dist) * maxOffset * factor).toFixed(2)),
          y: Number(((dy / dist) * (maxOffset * 0.8) * factor).toFixed(2)),
        });
      });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [interactive]);

  // Kedipan mata otomatis alami setiap 3 - 5.6 detik
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    let openTimeout: ReturnType<typeof setTimeout>;

    function scheduleBlink() {
      const delay = 3000 + Math.random() * 2600;
      blinkTimeout = setTimeout(() => {
        setBlinking(true);
        openTimeout = setTimeout(() => {
          setBlinking(false);
          scheduleBlink();
        }, 150);
      }, delay);
    }

    scheduleBlink();
    return () => {
      clearTimeout(blinkTimeout);
      clearTimeout(openTimeout);
    };
  }, []);

  function handleTriggerBounce() {
    if (!interactive) return;
    setClickedExcited(true);
    setTimeout(() => setClickedExcited(false), 900);
  }

  const isShy = effectiveMood === "shy";
  const isPeek = effectiveMood === "peek";
  const isHappyArc =
    effectiveMood === "happy" || effectiveMood === "celebrate";
  const isEncourage = effectiveMood === "encourage";
  const isFocused = effectiveMood === "focused";
  const isHangingRight = hangSide === "right";
  const isWavingActive = waving && !isShy && !isPeek;

  const pupilX = isFocused ? gaze.x * 0.6 : isEncourage ? 0 : gaze.x;
  const pupilY = isFocused ? Math.max(2, gaze.y) : isEncourage ? 1.5 : gaze.y;

  // Transformasi sayap kiri
  const leftWingTransform = isShy
    ? "translate(22px, -36px) rotate(-42deg)"
    : isPeek
      ? "translate(20px, -34px) rotate(-38deg)"
      : isHangingRight
        ? "translate(-6px, -6px) rotate(14deg)"
        : effectiveMood === "celebrate"
          ? "translate(-5px, -10px) rotate(22deg)"
          : hovered
            ? "translate(-2px, -4px) rotate(10deg)"
            : "translate(0px, 0px) rotate(0deg)";

  // Transformasi sayap kanan (jika tidak sedang waving loop)
  const rightWingTransform = isShy
    ? "translate(-22px, -36px) rotate(42deg)"
    : isPeek
      ? "translate(-10px, -14px) rotate(18deg)"
      : effectiveMood === "celebrate"
        ? "translate(5px, -10px) rotate(-22deg)"
        : hovered
          ? "translate(2px, -4px) rotate(-10deg)"
          : "translate(0px, 0px) rotate(0deg)";

  const bodyMotionClass = isEncourage
    ? "-rotate-3"
    : effectiveMood === "celebrate"
      ? "animate-owl-hop"
      : isHangingRight
        ? "animate-owl-hang"
        : "animate-owl-breathe";

  return (
    <div
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setGaze({ x: 0, y: 0 });
      }}
      onClick={handleTriggerBounce}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center select-none",
        interactive &&
          "cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95",
        withBackdrop && "rounded-2xl bg-indigo-950 p-1.5 shadow-sm",
        SIZE_CLASSES[size],
        className,
      )}
      title={interactive ? "Sapa Si Burung Hantu Literasik!" : undefined}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        role="img"
        aria-label="Maskot Burung Hantu Literasik"
        className={cn(
          "h-full w-full overflow-visible transition-transform duration-300",
          bodyMotionClass,
        )}
      >
        {/* Bayangan lembut di bawah kaki (sembunyikan saat menggantung di tepi box) */}
        {!isHangingRight && (
          <ellipse
            cx="100"
            cy="186"
            rx="42"
            ry="6"
            className="fill-indigo-950/25"
          />
        )}

        {/* Jambul Telinga Kiri & Kanan */}
        <g
          className={cn(
            "transition-transform duration-300",
            isHappyArc && "-translate-y-1",
            isEncourage && "translate-y-1",
          )}
        >
          <path
            d="M 42 26 Q 40 58 56 72 L 88 52 Q 66 34 42 26 Z"
            className="fill-slate-600"
          />
          <path
            d="M 42 26 Q 66 36 86 54 L 68 62 Q 48 48 42 26 Z"
            className="fill-slate-500"
          />
          <path
            d="M 158 26 Q 160 58 144 72 L 112 52 Q 134 34 158 26 Z"
            className="fill-slate-600"
          />
          <path
            d="M 158 26 Q 134 36 114 54 L 132 62 Q 152 48 158 26 Z"
            className="fill-slate-500"
          />
        </g>

        {/* Tubuh Utama Burung Hantu */}
        <ellipse
          cx="100"
          cy="108"
          rx="62"
          ry="68"
          className="fill-indigo-900"
        />
        <ellipse
          cx="100"
          cy="104"
          rx="58"
          ry="63"
          className="fill-indigo-800"
        />

        {/* Perut Putih & Bayangan Halus */}
        <ellipse cx="100" cy="136" rx="39" ry="38" className="fill-slate-200" />
        <ellipse cx="100" cy="133" rx="39" ry="36" className="fill-white" />

        {/* Ikon Buku Terbuka & Bintang Literasi di Perut */}
        <g className="transition-transform duration-300">
          <path
            d="M 76 132 L 98 139 L 98 156 L 76 150 Z"
            className="fill-amber-400"
          />
          <path
            d="M 124 132 L 102 139 L 102 156 L 124 150 Z"
            className="fill-amber-400"
          />
          <path
            d="M 80 126 Q 90 128 98 135 L 98 153 Q 90 147 80 146 Z"
            className="fill-teal-500"
          />
          <path
            d="M 120 126 Q 110 128 102 135 L 102 153 Q 110 147 120 146 Z"
            className="fill-teal-600"
          />
          <path
            d="M 100 110 L 103 118 L 111 121 L 103 124 L 100 132 L 97 124 L 89 121 L 97 118 Z"
            className="animate-owl-sparkle fill-amber-400"
          />
          <path
            d="M 112 106 L 113.5 110 L 117.5 111.5 L 113.5 113 L 112 117 L 110.5 113 L 106.5 111.5 L 110.5 110 Z"
            className="animate-owl-sparkle fill-amber-500"
          />
        </g>

        {/* Piringan Wajah Putih */}
        <circle cx="72" cy="78" r="34" className="fill-white" />
        <circle cx="128" cy="78" r="34" className="fill-white" />

        {/* Mata Kiri & Kanan */}
        <g>
          {isHappyArc && !isShy ? (
            <>
              <path
                d="M 57 79 Q 72 62 87 79"
                fill="none"
                strokeWidth="6.5"
                strokeLinecap="round"
                className="stroke-indigo-950"
              />
              <path
                d="M 113 79 Q 128 62 143 79"
                fill="none"
                strokeWidth="6.5"
                strokeLinecap="round"
                className="stroke-indigo-950"
              />
            </>
          ) : (
            <>
              <g
                style={{
                  transform: `translate(${pupilX}px, ${pupilY}px)`,
                  transition: "transform 90ms ease-out",
                }}
              >
                <circle
                  cx="73"
                  cy="79"
                  r={isFocused ? "13.5" : "13"}
                  className="fill-indigo-950"
                />
                <circle cx="68.5" cy="74.5" r="4.2" className="fill-white" />
                <circle cx="77" cy="83" r="1.8" className="fill-white/80" />
              </g>

              <g
                style={{
                  transform: `translate(${pupilX}px, ${pupilY}px)`,
                  transition: "transform 90ms ease-out",
                }}
              >
                <circle
                  cx="127"
                  cy="79"
                  r={isFocused ? "13.5" : "13"}
                  className="fill-indigo-950"
                />
                <circle cx="122.5" cy="74.5" r="4.2" className="fill-white" />
                <circle cx="131" cy="83" r="1.8" className="fill-white/80" />
              </g>

              {(blinking || isEncourage) && (
                <>
                  <path
                    d={
                      blinking
                        ? "M 47 54 H 97 V 104 H 47 Z"
                        : "M 47 54 H 97 V 68 Q 72 74 47 68 Z"
                    }
                    className="fill-indigo-100"
                  />
                  <path
                    d={
                      blinking
                        ? "M 103 54 H 153 V 104 H 103 Z"
                        : "M 103 54 H 153 V 68 Q 128 74 103 68 Z"
                    }
                    className="fill-indigo-100"
                  />
                </>
              )}
            </>
          )}
        </g>

        {/* Kacamata Bulat Teal */}
        <g>
          <rect
            x="34"
            y="74"
            width="12"
            height="6"
            rx="3"
            className="fill-teal-500"
          />
          <rect
            x="154"
            y="74"
            width="12"
            height="6"
            rx="3"
            className="fill-teal-500"
          />
          <path
            d="M 96 77 Q 100 71 104 77"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-teal-500"
          />
          <circle
            cx="72"
            cy="78"
            r="24.5"
            fill="none"
            strokeWidth="6"
            className="stroke-teal-500"
          />
          <circle
            cx="128"
            cy="78"
            r="24.5"
            fill="none"
            strokeWidth="6"
            className="stroke-teal-500"
          />
        </g>

        {/* Paruh Berlian 2 Sisi */}
        <g>
          <polygon
            points="100,84 89,97 100,113"
            className="fill-amber-400"
          />
          <polygon
            points="100,84 111,97 100,113"
            className="fill-amber-500"
          />
        </g>

        {/* Sayap Kiri (Berpegangan di tepi kotak saat hangSide="right") */}
        <g
          style={{
            transform: leftWingTransform,
            transformOrigin: "50px 104px",
            transition: "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <path
            d="M 44 94 C 24 110, 26 146, 52 162 C 58 142, 60 116, 44 94 Z"
            className="fill-slate-500"
          />
          <path
            d="M 46 98 C 34 114, 36 142, 53 156 C 58 138, 58 116, 46 98 Z"
            className="fill-indigo-900"
          />
        </g>

        {/* Cakar berpegangan saat menggantung di tepi kanan box */}
        {isHangingRight && !isShy && (
          <g className="fill-amber-400">
            <rect x="29" y="114" width="13" height="6.5" rx="3.2" />
            <rect x="27" y="122" width="15" height="6.5" rx="3.2" />
            <rect x="29" y="130" width="13" height="6.5" rx="3.2" />
          </g>
        )}

        {/* Sayap Kanan (Melambai saat waving aktif) */}
        <g
          className={isWavingActive ? "animate-owl-wave" : undefined}
          style={
            isWavingActive
              ? undefined
              : {
                  transform: rightWingTransform,
                  transformOrigin: "150px 104px",
                  transition: "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                }
          }
        >
          <path
            d="M 156 94 C 176 110, 174 146, 148 162 C 142 142, 140 116, 156 94 Z"
            className="fill-slate-500"
          />
          <path
            d="M 154 98 C 166 114, 164 142, 147 156 C 142 138, 142 116, 154 98 Z"
            className="fill-indigo-900"
          />
        </g>

        {/* Kaki Kiri & Kanan */}
        {isHangingRight ? (
          <g className="fill-slate-500">
            {/* Kaki kiri ikut bertumpu ke tepi kotak, kaki kanan menggantung santai */}
            <ellipse
              cx="60"
              cy="168"
              rx="5"
              ry="8.5"
              transform="rotate(28 60 168)"
            />
            <ellipse
              cx="67"
              cy="172"
              rx="5"
              ry="8.5"
              transform="rotate(24 67 172)"
            />
            <ellipse
              cx="74"
              cy="175"
              rx="5"
              ry="8.5"
              transform="rotate(20 74 175)"
            />

            <ellipse
              cx="109"
              cy="175"
              rx="5"
              ry="9"
              transform="rotate(-8 109 175)"
            />
            <ellipse
              cx="117"
              cy="176"
              rx="5"
              ry="9"
              transform="rotate(-8 117 176)"
            />
            <ellipse
              cx="125"
              cy="175"
              rx="5"
              ry="9"
              transform="rotate(-8 125 175)"
            />
          </g>
        ) : (
          <g className="fill-slate-500">
            <ellipse cx="75" cy="174" rx="5" ry="9" />
            <ellipse cx="83" cy="175" rx="5" ry="9" />
            <ellipse cx="91" cy="174" rx="5" ry="9" />

            <ellipse cx="109" cy="174" rx="5" ry="9" />
            <ellipse cx="117" cy="175" rx="5" ry="9" />
            <ellipse cx="125" cy="174" rx="5" ry="9" />
          </g>
        )}
      </svg>
    </div>
  );
}

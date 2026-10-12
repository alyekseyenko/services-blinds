/** Login backdrop: field measurement sketches (window dims + tape measure). */

function DimensionArrowH({ y, x1, x2, label }: { y: number; x1: number; x2: number; label: string }) {
  const mid = (x1 + x2) / 2;
  return (
    <g className="login-scene-dim">
      <line className="login-scene-ext" x1={x1} y1={y - 28} x2={x1} y2={y + 12} />
      <line className="login-scene-ext" x1={x2} y1={y - 28} x2={x2} y2={y + 12} />
      <line className="login-scene-measure login-scene-measure--draw" x1={x1} y1={y} x2={x2} y2={y} pathLength={1} />
      <polyline
        className="login-scene-measure"
        points={`${x1 + 10},${y - 6} ${x1},${y} ${x1 + 10},${y + 6}`}
      />
      <polyline
        className="login-scene-measure"
        points={`${x2 - 10},${y - 6} ${x2},${y} ${x2 - 10},${y + 6}`}
      />
      <text className="login-scene-label" x={mid} y={y + 22} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function DimensionArrowV({ x, y1, y2, label }: { x: number; y1: number; y2: number; label: string }) {
  const mid = (y1 + y2) / 2;
  return (
    <g className="login-scene-dim">
      <line className="login-scene-ext" x1={x - 28} y1={y1} x2={x + 12} y2={y1} />
      <line className="login-scene-ext" x1={x - 28} y1={y2} x2={x + 12} y2={y2} />
      <line className="login-scene-measure login-scene-measure--draw" x1={x} y1={y1} x2={x} y2={y2} pathLength={1} />
      <polyline
        className="login-scene-measure"
        points={`${x - 6},${y1 + 10} ${x},${y1} ${x + 6},${y1 + 10}`}
      />
      <polyline
        className="login-scene-measure"
        points={`${x - 6},${y2 - 10} ${x},${y2} ${x + 6},${y2 - 10}`}
      />
      <text
        className="login-scene-label login-scene-label--vertical"
        x={x + 20}
        y={mid}
        textAnchor="middle"
        transform={`rotate(-90 ${x + 20} ${mid})`}
      >
        {label}
      </text>
    </g>
  );
}

function WindowMeasureSketch() {
  const wx = 72;
  const wy = 48;
  const ww = 300;
  const wh = 360;
  return (
    <g className="login-scene-sketch">
      <rect className="login-scene-window" x={wx} y={wy} width={ww} height={wh} rx="2" />
      <line className="login-scene-cross" x1={wx} y1={wy} x2={wx + 16} y2={wy + 16} />
      <line className="login-scene-cross" x1={wx + ww} y1={wy} x2={wx + ww - 16} y2={wy + 16} />
      <line className="login-scene-cross" x1={wx} y1={wy + wh} x2={wx + 16} y2={wy + wh - 16} />
      <line className="login-scene-cross" x1={wx + ww} y1={wy + wh} x2={wx + ww - 16} y2={wy + wh - 16} />

      <DimensionArrowH y={wy + wh + 44} x1={wx} x2={wx + ww} label="1420 mm" />
      <DimensionArrowV x={wx + ww + 44} y1={wy} y2={wy + wh} label="1180 mm" />

      <g className="login-scene-laser" transform={`translate(${wx} ${wy + wh + 44})`}>
        <circle className="login-scene-laser-dot" r="5" cy="0">
          <animateMotion dur="7s" repeatCount="indefinite" path={`M 0 0 L ${ww} 0`} />
        </circle>
      </g>
    </g>
  );
}

function TapeMeasureSketch() {
  return (
    <g className="login-scene-sketch login-scene-sketch--small">
      <rect className="login-scene-note" x="0" y="0" width="220" height="200" rx="4" />
      <text className="login-scene-note-title" x="16" y="28">Janela · sala</text>
      <rect className="login-scene-window login-scene-window--small" x="36" y="48" width="120" height="96" />
      <line className="login-scene-measure" x1="36" y1="160" x2="156" y2="160" />
      <text className="login-scene-label" x="96" y="178" textAnchor="middle">1240</text>
      <line className="login-scene-measure" x1="168" y1="48" x2="168" y2="144" />
      <text className="login-scene-label" x="186" y="98" textAnchor="middle">980</text>

      <g transform="translate(8 168)">
        <rect className="login-scene-tape-body" x="0" y="0" width="52" height="32" rx="3" />
        <circle className="login-scene-tape-hole" cx="26" cy="16" r="8" />
        <line
          className="login-scene-tape-blade login-scene-tape-blade--extend"
          x1="52"
          y1="16"
          x2="200"
          y2="16"
          pathLength={1}
        />
        <circle className="login-scene-laser-dot login-scene-laser-dot--tape" r="4" cy="16" cx="52">
          <animateMotion dur="5s" repeatCount="indefinite" path="M 0 0 L 148 0" />
        </circle>
      </g>
    </g>
  );
}

export function LoginSceneBackdrop() {
  return (
    <div className="login-scene-backdrop pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="login-scene-grid-lines absolute inset-0" />

      <svg
        className="login-scene-drawings absolute inset-0 h-full w-full text-foreground"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(40 64) scale(1)">
          <WindowMeasureSketch />
        </g>
        <g transform="translate(680 620)">
          <TapeMeasureSketch />
        </g>
      </svg>
    </div>
  );
}

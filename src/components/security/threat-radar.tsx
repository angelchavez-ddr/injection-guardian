"use client";

import { useId, useLayoutEffect, useState } from "react";
import {
  RADAR_AXES,
  radarAxisLabel,
  type RadarAxis,
  type RadarScores,
} from "@/lib/security/threat-radar";

const SIZE = 440;
const CENTER = 220;
const RADIUS = 124;

export function ThreatRadar({ scores }: { scores: RadarScores }) {
  const clipId = `inspector-${useId().replaceAll(":", "")}`;
  const [play, setPlay] = useState(false);
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    setPlay(true);
  }, []);
  const rings = [0.34, 0.67, 1];
  const dataPoints = RADAR_AXES.map((axis, index) => point(index, scores[axis]));
  const label = RADAR_AXES.map((axis) => `${radarAxisLabel(axis)} ${scores[axis]}`).join(", ");
  const glowId = `${clipId}-glow`;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={play ? "inspector-play relative mx-auto h-auto w-full" : "relative mx-auto h-auto w-full"}
      role="img"
      aria-label={`Reporte avanzado del inspector: ${label}`}
    >
      <defs>
        <clipPath id={clipId}>
          <polygon points={ringPoints(1)} />
        </clipPath>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g className="inspector-grid">
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={ringPoints(ring)}
            className="fill-none stroke-border"
            strokeWidth={ring === 1 ? 1.25 : 1}
          />
        ))}
        {RADAR_AXES.map((axis, index) => {
          const [x, y] = point(index, 100);
          return <line key={axis} x1={CENTER} y1={CENTER} x2={x} y2={y} className="stroke-border" strokeWidth={1} />;
        })}
      </g>
      <g clipPath={`url(#${clipId})`} aria-hidden>
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="inspector-pulse fill-none stroke-teal-200" strokeWidth={1.5} />
        <g className="inspector-sweep">{beam()}</g>
        <g className="inspector-live">{beam()}</g>
      </g>
      <polygon points={toPoints(dataPoints)} className="inspector-fill fill-teal-400/40" />
      <polygon
        points={toPoints(dataPoints)}
        pathLength={100}
        filter={`url(#${glowId})`}
        className="inspector-trace fill-none stroke-teal-200"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {dataPoints.map(([x, y], index) => (
        <g key={RADAR_AXES[index]} className="inspector-dot" style={{ animationDelay: `${1.15 + index * 0.08}s` }}>
          <circle cx={x} cy={y} r={8} className="fill-teal-300/20" />
          <circle cx={x} cy={y} r={3.5} className="fill-teal-200" />
        </g>
      ))}
      {RADAR_AXES.map((axis, index) => {
        const [x, y] = labelPoint(index);
        const [first, second] = axisLines(axis);
        return (
          <text key={axis} x={x} y={y} textAnchor="middle" className="inspector-grid fill-foreground text-[13px]">
            {first}
            {second ? (
              <tspan x={x} dy="16">
                {second}
              </tspan>
            ) : null}
            <tspan x={x} dy="18" className="fill-teal-200 text-[15px] font-semibold tabular-nums">
              {scores[axis]}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

function beam() {
  const edge = point(0, 100);
  const side = point(0.38, 100);
  return (
    <>
      <polygon points={`${CENTER},${CENTER} ${edge[0]},${edge[1]} ${side[0]},${side[1]}`} className="fill-teal-300/30" />
      <line x1={CENTER} y1={CENTER} x2={edge[0]} y2={edge[1]} className="stroke-teal-100" strokeWidth={1.5} />
    </>
  );
}

function ringPoints(scale: number): string {
  return toPoints(RADAR_AXES.map((_, index) => point(index, scale * 100)));
}

function point(index: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / RADAR_AXES.length;
  const radius = (value / 100) * RADIUS;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}

function labelPoint(index: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / RADAR_AXES.length;
  const radius = RADIUS + 52;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle) - 6];
}

function axisLines(axis: RadarAxis): [string, string] {
  switch (axis) {
    case "phishing":
      return ["Phishing", ""];
    case "prompt_injection":
      return ["Prompt", "injection"];
    case "impersonation":
      return ["Suplantación", ""];
    case "exfiltration":
      return ["Exfiltración", ""];
    case "tool_abuse":
      return ["Abuso de", "herramientas"];
    default: {
      const unreachable: never = axis;
      return unreachable;
    }
  }
}

function toPoints(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

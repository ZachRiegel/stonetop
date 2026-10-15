// The glass bubble that follows a drag round a RadialMenu: its place in CSS, and the lens,
// sheen and rim sharing one morphing shape. README.md, "The glass bubble", has the design.
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import type { Hit } from "components/radialMenu/geometry.ts";
import React from "react";

// the glass's highlights are white whatever the palette, as SVG stop attributes
const WHITE = "#ffffff";
// how far the lens magnifies what is under it
const ZOOM = 1.03;
// a feColorMatrix keeping only one channel, and alpha, of its input
const only = (channel: number) =>
  Array.from({ length: 4 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => Number(col === row && (row === channel || row === 3))),
  )
    .map((row) => row.join(" "))
    .join("  ");
// how far the rim bends each colour channel, in px, red least and blue most
const CHANNELS = [
  { channel: "r", scale: -8, keep: only(0) },
  { channel: "g", scale: -10, keep: only(1) },
  { channel: "b", scale: -12, keep: only(2) },
];

// The bubble as drawn: its shape, what it sits `on` (null when free), `placed` is the last
// segment's centre, kept after leaving it, `mouse` the held pointer. A `hop` is straight
// from one placed spot (a segment or the centre) to another, which eases the placed point. It stays after the drag,
// `shown` off, so the glass fades out in its last shape.
export type Drawn = {
  d: string;
  on: Hit | null;
  placed: readonly [number, number];
  mouse: readonly [number, number];
  hop: boolean;
  shown: boolean;
};

// The bubble's place in CSS: the segment it is placed on, the pointer, and a slider mixing
// the two, registered in RootLayout.tsx so they interpolate. The slider transitions, as does
// the placed point when hopping between segments; arriving from free the slider already
// carries the move, so the placed point jumps. The pointer never transitions.
const Bubble = styled.g`
  --radial-menu-x: calc(
    var(--radial-menu-mouse-x) + (var(--radial-menu-placed-x) - var(--radial-menu-mouse-x)) *
      var(--radial-menu-slide)
  );
  --radial-menu-y: calc(
    var(--radial-menu-mouse-y) + (var(--radial-menu-placed-y) - var(--radial-menu-mouse-y)) *
      var(--radial-menu-slide)
  );
  transition:
    --radial-menu-slide 200ms ease-out,
    --radial-menu-placed-x 200ms ease-out,
    --radial-menu-placed-y 200ms ease-out;

  &:where(.arriving) {
    transition-duration: 200ms, 0ms, 0ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// A pane of glass over whatever a drag is passing: a lens, a sheen and a rim sharing one
// shape, which morphs between a circle and the segments' shapes. The lens is the live menu
// again, through a <use>, clipped to the shape, magnified about the glass's place and bent
// at the rim. Filters cannot see what lies beneath an element, so the menu has to be drawn
// into it.
const Pane = styled.g`
  filter: drop-shadow(0 3px 8px rgb(0 0 0 / 0.45));
  transition: opacity 200ms ease-out;
`;
// the defs' prefix travels as `ids`: an `id` prop would be forwarded to the element
const Lens = styled.g<{ ids: string }>`
  filter: url(#${({ ids }) => ids}-refract);
`;
const Magnified = styled.use`
  transform: translate(var(--radial-menu-x), var(--radial-menu-y)) scale(${ZOOM})
    translate(calc(-1 * var(--radial-menu-x)), calc(-1 * var(--radial-menu-y)));
`;
// the glass's layers share one place and one morphing shape
const placedAt = css`
  translate: var(--radial-menu-x) var(--radial-menu-y);
`;
const morphing = css`
  transition: d 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Placed = styled.g`
  ${placedAt}
`;
const Clip = styled.path`
  ${placedAt}
  ${morphing}
`;
const Sheen = styled.path<{ ids: string }>`
  fill: url(#${({ ids }) => ids}-sheen);
  ${morphing}
`;
const Rim = styled.path<{ ids: string }>`
  fill: none;
  stroke: url(#${({ ids }) => ids}-rim);
  stroke-width: 1.5px;
  ${morphing}
`;

// Drawn inside the menu's SVG over the arcs group, whose element id is `${id}-arcs`; the
// defs are prefixed by `id` too, so menus on one page keep apart.
const Glass = ({ id, drawn }: { id: string; drawn: Drawn }) => {
  // the shape, and the place for the Bubble's variables (custom properties are not in
  // React's style type, hence the cast)
  const shape = { d: `path("${drawn.d}")` };
  const place = {
    "--radial-menu-placed-x": `${drawn.placed[0]}px`,
    "--radial-menu-placed-y": `${drawn.placed[1]}px`,
    "--radial-menu-mouse-x": `${drawn.mouse[0]}px`,
    "--radial-menu-mouse-y": `${drawn.mouse[1]}px`,
    "--radial-menu-slide": drawn.on ? 1 : 0,
  } as React.CSSProperties;
  return (
    <Bubble className={drawn.on && !drawn.hop ? "arriving" : undefined} style={place} aria-hidden>
      <defs>
        <clipPath id={`${id}-glass`}>
          <Clip style={shape} />
        </clipPath>
        {/* Refraction in a band at the rim: the glass's blurred silhouette is a height map
            whose slope (Sobel kernels; feConvolveMatrix applies them flipped) pulls the
            picture outward at the edge like a convex lens and is flat inside. Each colour
            channel bends a little differently for a chromatic fringe, the result is
            softened (displacement is not supersampled) and cut back to the silhouette. */}
        <filter
          id={`${id}-refract`}
          x="-25%"
          y="-25%"
          width="150%"
          height="150%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation={3} result="height" />
          <feColorMatrix
            in="height"
            values="0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1"
            result="grey"
          />
          <feConvolveMatrix
            in="grey"
            order={3}
            kernelMatrix="-1 0 1 -2 0 2 -1 0 1"
            divisor={2}
            bias={0.5}
            preserveAlpha
            result="dx"
          />
          <feConvolveMatrix
            in="grey"
            order={3}
            kernelMatrix="-1 -2 -1 0 0 0 1 2 1"
            divisor={2}
            bias={0.5}
            preserveAlpha
            result="dy"
          />
          <feColorMatrix in="dx" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="red" />
          <feColorMatrix
            in="dy"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1"
            result="green"
          />
          <feComposite in="red" in2="green" operator="arithmetic" k2={1} k3={1} result="map" />
          {CHANNELS.map(({ channel, scale, keep }) => (
            <React.Fragment key={channel}>
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale={scale}
                xChannelSelector="R"
                yChannelSelector="G"
                result={`bent-${channel}`}
              />
              <feColorMatrix in={`bent-${channel}`} values={keep} result={channel} />
            </React.Fragment>
          ))}
          <feComposite in="r" in2="g" operator="arithmetic" k2={1} k3={1} result="rg" />
          <feComposite in="rg" in2="b" operator="arithmetic" k2={1} k3={1} />
          <feGaussianBlur stdDeviation={0.4} />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <radialGradient id={`${id}-sheen`} cx={0.3} cy={0.25} r={0.7}>
          <stop offset={0} stopColor={WHITE} stopOpacity={0.4} />
          <stop offset={0.6} stopColor={WHITE} stopOpacity={0.1} />
          <stop offset={1} stopColor={WHITE} stopOpacity={0.2} />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1={0} y1={0} x2={1} y2={1}>
          <stop offset={0} stopColor={WHITE} stopOpacity={0.85} />
          <stop offset={0.45} stopColor={WHITE} stopOpacity={0.15} />
          <stop offset={0.7} stopColor={WHITE} stopOpacity={0.2} />
          <stop offset={1} stopColor={WHITE} stopOpacity={0.6} />
        </linearGradient>
      </defs>
      <Pane style={{ opacity: drawn.shown ? 1 : 0 }}>
        {/* clipped before the filter sees it, so the silhouette the rim is bent from is the
            glass's own */}
        <Lens ids={id}>
          <g clipPath={`url(#${id}-glass)`}>
            <Magnified href={`#${id}-arcs`} />
          </g>
        </Lens>
        <Placed>
          <Sheen ids={id} style={shape} />
          <Rim ids={id} style={shape} />
        </Placed>
      </Pane>
    </Bubble>
  );
};

export default Glass;

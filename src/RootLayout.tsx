import { css, Global } from "@emotion/react";
import useBlurOnEscape from "hooks/useBlurOnEscape.ts";
import { CREAM, DICE } from "pages/dice/dice.ts";
import { unlockOnGesture } from "pages/dice/sounds.ts";
import { Suspense, useEffect } from "react";
import { Outlet } from "react-router";

const RootLayout = () => {
  useBlurOnEscape();
  // audio may only start from a gesture, and the first one is usually before the dice page;
  // the dice module owns the audio for now, and this moves with it when something else sounds
  useEffect(unlockOnGesture, []);
  return (
    <>
      <Global
        styles={css`
          @property --label-width {
            inherits: true;
            syntax: "<length>";
            initial-value: 0px;
          }
          @property --custom-background-color {
            inherits: true;
            syntax: "<color>";
            initial-value: transparent;
          }
          /* the radial menu's glass bubble (components/radialMenu/README.md): registered so
             they interpolate */
          @property --radial-menu-placed-x {
            inherits: true;
            syntax: "<length>";
            initial-value: 0px;
          }
          @property --radial-menu-placed-y {
            inherits: true;
            syntax: "<length>";
            initial-value: 0px;
          }
          @property --radial-menu-mouse-x {
            inherits: true;
            syntax: "<length>";
            initial-value: 0px;
          }
          @property --radial-menu-mouse-y {
            inherits: true;
            syntax: "<length>";
            initial-value: 0px;
          }
          @property --radial-menu-slide {
            inherits: true;
            syntax: "<number>";
            initial-value: 0;
          }
          :root,
          dialog {
            --neutral-0: #000000;
            --neutral-25: #070707;
            --neutral-50: #0e0e0e;
            --neutral-75: #151515;
            --neutral-100: #1c1c1c;
            --neutral-150: #2b2b2b;
            --neutral-200: #393939;
            --neutral-250: #474747;
            --neutral-300: #555555;
            --neutral-350: #636363;
            --neutral-400: #717171;
            --neutral-450: #808080;
            --neutral-500: #8e8e8e;
            --neutral-550: #9c9c9c;
            --neutral-600: #aaaaaa;
            --neutral-650: #b8b8b8;
            --neutral-700: #c6c6c6;
            --neutral-750: #d5d5d5;
            --neutral-800: #e3e3e3;
            --neutral-850: #f1f1f1;
            --neutral-900: #ffffff;
            /* the dice page's paper, the glyph colour on the dice themselves, and its highlight */
            --cream: ${CREAM};
            --white: #ffffff;
            /* ramps round the dice colours (500 is the die's own hex) and a green at the same
               lightness, darker and lighter steps for states */
            --cyan-300: #1a6f87;
            --cyan-400: #2394b4;
            --cyan-500: ${DICE.blue.hex};
            --cyan-600: #80d5ed;
            --cyan-700: #b5e6f4;
            --magenta-300: #972f96;
            --magenta-400: #ca3ec8;
            --magenta-500: ${DICE.violet.hex};
            --magenta-600: #fd83fc;
            --magenta-700: #feaffd;
            --orange-300: #97422b;
            --orange-400: #ca5839;
            --orange-500: ${DICE.orange.hex};
            --orange-600: #fd9a7e;
            --orange-700: #febeac;
            --green-300: #26732f;
            --green-400: #32993e;
            --green-500: #3fbf4e;
            --green-600: #7ed488;
            --green-700: #b2e5b8;
            --shadow-small: 0 1px 2px rgba(0, 0, 0, 0.24);
            --shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.28);
            --shadow-large: 0 12px 24px rgba(0, 0, 0, 0.36);
          }
          /* 1. Use a more-intuitive box-sizing model */
          *,
          *::before,
          *::after {
            box-sizing: border-box;
          }
          /* 2. Remove default margin */
          * {
            margin: 0;
            user-select: none;
          }
          /* 3. Enable keyword animations */
          @media (prefers-reduced-motion: no-preference) {
            html {
              interpolate-size: allow-keywords;
            }
          }
          body {
            /* every page's ground: one flat dark neutral (user, 2026-10-19: no texture), a
               shade under the cards' neutral-75 so they still stand off it */
            background-color: var(--neutral-50);
            /* 4. Increase line-height */
            line-height: 1.5;
            /* 5. Improve text rendering */
            -webkit-font-smoothing: antialiased;
          }
          /* 6. Improve media defaults */
          img,
          picture,
          video,
          canvas,
          svg {
            display: block;
            max-width: 100%;
          }
          /* 7. Inherit fonts for form controls */
          input,
          button,
          textarea,
          select {
            font: inherit;
          }
          /* 8. Avoid text overflows */
          p,
          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            overflow-wrap: break-word;
          }
          /* 9. Improve line wrapping */
          p {
            text-wrap: pretty;
          }
          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            text-wrap: balance;
          }
          /*
          10. Create a root stacking context
        */
          #root {
            isolation: isolate;
          }
          /* 11. Remove default anchor styling */
          a {
            color: inherit;
            text-decoration: none;
          }
          dialog {
            width: 100vw;
            height: 100vh;
            background-color: transparent;
            padding: 0;
            outline: none;
            border: none;
            max-width: unset;
            max-height: unset;
          }
          /* Firefox: no way to pin an exact width; thin renders at 8px */
          * {
            scrollbar-width: thin;
            scrollbar-color: var(--neutral-300) transparent;
          }
          /* Chromium/Safari: pin scrollbars (and thus scrollbar gutters) to
           exactly 8px. The standard properties must be reset to auto or
           Chrome ignores ::-webkit-scrollbar styling entirely. */
          @supports selector(::-webkit-scrollbar) {
            * {
              scrollbar-width: auto;
              scrollbar-color: auto;
            }
            ::-webkit-scrollbar {
              width: 8px;
              height: 8px;
            }
            ::-webkit-scrollbar-thumb {
              background: var(--neutral-300);
              border-radius: 999px;
            }
            ::-webkit-scrollbar-track {
              background: transparent;
            }
          }
        `}
      />
      <Suspense>
        <Outlet />
      </Suspense>
    </>
  );
};

export default RootLayout;

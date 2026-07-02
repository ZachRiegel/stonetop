import { Outlet } from "react-router";
import { Global, css } from "@emotion/react";
import { Suspense } from "react";

const RootLayout = () => (
  <>
    <Global
      styles={css`
        /* Grayscale palette: 0 = black (dark), 900 = white (light) */
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
        }
        /* 3. Enable keyword animations */
        @media (prefers-reduced-motion: no-preference) {
          html {
            interpolate-size: allow-keywords;
          }
        }
        body {
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
        #root,
        #__next {
          isolation: isolate;
        }

        * {
          box-sizing: border-box;
        }
        dialog {
          width: 100vw;
          height: 100vh;
          background-color: transparent;
          margin: 0;
          padding: 0;
          outline: none;
          border: none;
          max-width: unset;
          max-height: unset;
        }
        body {
          margin: 0;
        }
      `}
    />
    <Suspense>
      <Outlet />
    </Suspense>
  </>
);

export default RootLayout;

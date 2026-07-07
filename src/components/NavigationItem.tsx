import styled from "@emotion/styled";
import { Link as ReactRouterLink } from "react-router";

// Must render inside the left-nav <Nav> (container-name: navigation) — relies on
// its --expanded-width, --navigation-horizontal-padding, and --custom-transition-delay
// vars plus the --open container style query.
//
// The first child stays visible while the nav is collapsed; the rest fade in on expand.
const BaseNavigationItem = styled.label`
  display: grid;
  padding: 8px 12px;
  min-width: calc(var(--expanded-width) - 2 * var(--navigation-horizontal-padding));
  grid-template-columns: max-content 1fr max-content;
  grid-template-rows: max-content;
  gap: 12px;
  align-items: center;
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  translate: calc(-1 * var(--navigation-horizontal-padding)) 0;
  background-color: var(--custom-background-color);

  transition:
    --custom-background-color 300ms linear,
    padding 300ms linear,
    translate 300ms linear;
  transition-delay: var(--custom-transition-delay);

  & > *:not(:first-child) {
    opacity: 0;
    transition: opacity 300ms linear;
  }

  @container navigation style(--open: true) {
    translate: 0 0;

    & > *:not(:first-child) {
      opacity: 1;
    }
  }
`;

const NavigationItem = {
  Solid: styled(BaseNavigationItem)`
    @container navigation style(--open: true) {
      --custom-background-color: var(--neutral-100);
      box-shadow: var(--shadow-small);
    }
  `,
  Transparent: styled(BaseNavigationItem)`
    &:hover {
      background-color: var(--neutral-75);
    }
  `,
  TransparentLink: styled(BaseNavigationItem.withComponent(ReactRouterLink))`
    color: var(--neutral-700);
    text-decoration: none;

    &:hover {
      background-color: var(--neutral-75);
      text-decoration: underline;
    }

    &:focus-visible {
      outline: 2px solid var(--neutral-700);
      outline-offset: -2px;
      text-decoration: underline;
    }
  `,
};

export default NavigationItem;

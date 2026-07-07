import styled from "@emotion/styled";
import type { FontProps } from "components/Font.tsx";
import type { FC } from "react";
import { Link as ReactRouterLink } from "react-router";

const LinkInternals = ({
  text,
  to,
  className,
  Font,
}: {
  text: string;
  to: string;
  className?: string;
  Font: FC<FontProps>;
}) => (
  <ReactRouterLink className={className} to={to}>
    <Font element="div" text={text} />
  </ReactRouterLink>
);

const Link = styled(LinkInternals)`
  color: var(--neutral-700);
  cursor: pointer;
  text-decoration: none;

  & > * {
    border-radius: 8px;
  }

  &:hover > * {
    text-decoration: underline;
  }

  &:focus-visible > * {
    outline: 2px solid var(--neutral-700);
    outline-offset: 2px;
  }
`;

export default Link;

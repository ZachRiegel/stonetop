import styled from "@emotion/styled";
import * as React from "react";
import type { HTMLInputTypeAttribute } from "react";
import { TextCSS } from "./Text.tsx";

const InputInternals = ({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (value: string, event: React.ChangeEvent) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  className?: string;
}) => (
  <input
    className={className}
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={(event) => onChange(event.target.value, event)}
  />
);

const Input = styled(InputInternals)`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--neutral-600);
  border-radius: 12px;
  background: transparent;
  ${TextCSS.Normal16}
`;

export default Input;

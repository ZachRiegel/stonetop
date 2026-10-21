import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import hourglass from "assets/hourglass.png";

const LoadingInternal = ({ className }: { className?: string }) => (
  <img className={className} src={hourglass} alt="Loading" />
);

const Pulse = keyframes`
  from {
    opacity: 0.4;
  }
  to {
    opacity: 0.8;
  }
`;

// the hourglass is white on transparent (converted from white on black, 2026-10-19: a
// screen-blended image left its black square on the flat ground), so it needs no blend
const BaseLoading = styled(LoadingInternal)`
  display: block;
  width: auto;
  animation: ${Pulse} 2s linear alternate-reverse infinite;
  object-fit: contain;
  margin: auto;
`;

const Loading = {
  Medium: styled(BaseLoading)`
    height: 128px;
  `,
};

export default Loading;

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

const BaseLoading = styled(LoadingInternal)`
  display: block;
  width: auto;
  mix-blend-mode: screen;
  animation: ${Pulse} 2s linear alternate-reverse infinite;
  object-fit: contain;
  margin: auto;
`;

const Loading = {
  Small: styled(BaseLoading)`
    height: 64px;
  `,
  Medium: styled(BaseLoading)`
    height: 128px;
  `,
  Large: styled(BaseLoading)`
    height: 256px;
  `,
};

export default Loading;

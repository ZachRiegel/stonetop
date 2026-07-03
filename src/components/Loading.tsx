import styled from "@emotion/styled";

import hourglass from "assets/hourglass.png";

const LoadingInternal = ({ className }: { className?: string }) => (
  <img className={className} src={hourglass} alt="Loading" />
);

const BaseLoading = styled(LoadingInternal)`
  display: block;
  width: auto;
  mix-blend-mode: screen;
`;

const Loading = {
  Small: styled(BaseLoading)`
    height: 32px;
  `,
  Medium: styled(BaseLoading)`
    height: 64px;
  `,
  Large: styled(BaseLoading)`
    height: 128px;
  `,
};

export default Loading;

import { css, Global } from "@emotion/react";
import styled from "@emotion/styled";
import background from "assets/background.svg";
import { signInWithRedirect } from "aws-amplify/auth";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import { useNavigate } from "react-router";

import gintoWoff from "./ABCGintoDiscord-Medium.woff";
import footer from "./footer.png";

const discordFont = css`
  @font-face {
    font-family: "ABC Ginto Discord";
    src: url("${gintoWoff}") format("woff");
    font-weight: 500;
    font-style: normal;
  }
`;

const Page = styled.div`
  display: grid;
  justify-content: center;
  align-content: center;
  align-items: center;
  min-width: 100vw;
  min-height: 100vh;
  background-image: url("${background}");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  grid-template-rows: 1fr auto;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  height: max-content;
`;

const Footer = styled.img`
  display: block;
  max-height: 600px;
  min-width: 100vw;
  object-position: top;
  object-fit: cover;
  mix-blend-mode: screen;
  opacity: 0.7;
  aspect-ratio: 3309 / 1127;
`;

const DiscordButton = styled(Button.Primary)`
  font-family: "ABC Ginto Discord", "gg sans", "Helvetica Neue", sans-serif;
  font-weight: 500;
  color: #e0e3ff;
  background: #5865f2;
  --icon-size: 32px;
  & > span:first-child {
    gap: 12px;
  }
  &:where(:hover:not(:disabled)) {
    background: #4752c4;
  }
  &:where(:active:not(:disabled)) {
    background: #3c45a5;
  }
`;

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = async () => {
    await signInWithRedirect({
      provider: { custom: "auth0" },
    });
    navigate("/");
  };

  return (
    <Page>
      <Global styles={discordFont} />
      <Content>
        <h1>
          <Font.Title80 text="Stonetop" />
        </h1>
        <DiscordButton
          type="submit"
          text="Sign in with Discord"
          onClick={handleLogin}
          Icon={Icon.Discord}
        />
      </Content>
      <Footer src={footer} alt="" />
    </Page>
  );
};

export default Login;

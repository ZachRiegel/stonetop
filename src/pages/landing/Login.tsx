import { css, Global } from "@emotion/react";
import styled from "@emotion/styled";
import Button from "components/Button.tsx";
import Font from "components/Font.tsx";
import Icon from "components/Icon.tsx";
import { GROUND } from "components/PosterWall.tsx";
import { authClient } from "lib/auth-client.ts";
import gintoWoff from "pages/landing/ABCGintoDiscord-Medium.woff";
import footer from "pages/landing/footer.png";

const discordFont = css`
  @font-face {
    font-family: "ABC Ginto Discord";
    src: url("${gintoWoff}") format("woff");
    font-weight: 500;
    font-style: normal;
    ascent-override: 85%;
    descent-override: 15%;
    line-gap-override: 20%;
  }
`;

// paints its own ground and isolates, so the footer's screen blend meets it (see GROUND)
const Page = styled.div`
  ${GROUND}
  display: grid;
  justify-content: center;
  align-content: center;
  align-items: center;
  min-width: 100vw;
  min-height: 100vh;
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
  &:where(:hover:not(:disabled)) {
    background: #4752c4;
  }
  &:where(:active:not(:disabled)) {
    background: #3c45a5;
  }
`;

// carry a pending invite through the OAuth round-trip; the Home page redeems it once we land
// back on "/"
const signIn = () => {
  const inviteLinkId = sessionStorage.getItem("inviteLinkId");
  return authClient.signIn.social({
    provider: "discord",
    callbackURL: `${window.location.origin}/${inviteLinkId ? `?inviteLinkId=${inviteLinkId}` : ""}`,
  });
};

const Login = () => (
  <Page>
    <Global styles={discordFont} />
    <Content>
      <h1>
        <Font.Title80 text="Stonetop" />
      </h1>
      <DiscordButton
        type="submit"
        text="Sign in with Discord"
        onClick={signIn}
        Icon={Icon.Discord}
      />
    </Content>
    <Footer src={footer} alt="" />
  </Page>
);

export default Login;

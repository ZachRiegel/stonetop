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

// the page on the app's ground (GROUND), the sign-in centred over the standing stones
const Page = styled.div`
  ${GROUND}
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  align-content: center;
  align-items: center;
  width: 100%;
  min-height: 100vh;
  /* the visible height on a phone, whose browser bars come and go */
  min-height: 100dvh;
  grid-template-rows: 1fr auto;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  height: max-content;
`;

// the page's width (an auto width let the image run to its own 3309px on a phone, with a
// scrollbar to match, 2026-10-20), cropped to 600px tall at most and to under half the height
// of a phone on its side, so the title and the button keep their room above it
const Footer = styled.img`
  display: block;
  max-height: min(600px, 40vh);
  width: 100%;
  object-position: top;
  object-fit: cover;
  opacity: 0.7;
  aspect-ratio: 3309 / 1127;
`;

// 80px from a tablet up, and down to what a phone's width, or a sideways phone's height,
// holds
const Title = styled(Font.Title80)`
  font-size: clamp(44px, min(15vw, 18vh), 80px);
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
        <Title text="Stonetop" />
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

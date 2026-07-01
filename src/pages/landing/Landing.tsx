import { useState } from "react";
import styled from "@emotion/styled";

import Text from "components/Text.tsx";
import Input from "components/Input.tsx";
import Button from "components/Button.tsx";

import { signInWithRedirect } from "aws-amplify/auth";

import background from "assets/background.png";
import footer from "./footer.png";

const Page = styled.div`
  display: flow-root;
  min-width: 100vw;
  min-height: 100vh;
  background-image: url(${background});
  background-size: auto;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding-top: 12vh;
`;

const Footer = styled.img`
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 400px;
  min-width: 100vw;
  object-position: top;
  mix-blend-mode: screen;
  opacity: 0.6;
`;

const Landing = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    await signInWithRedirect({
      provider: { custom: "auth0" },
    });
    // TODO: wire up authentication
    console.log("Log in", { username, password });
  };

  return (
    <Page>
      <Content>
        <h1>
          <Text.Title80 text="Stonetop" />
        </h1>
        <Button type="submit" text="Log In" onClick={handleLogin} />
      </Content>
      <Footer src={footer} alt="" />
    </Page>
  );
};

export default Landing;

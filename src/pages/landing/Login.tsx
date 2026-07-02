import { use, useState } from "react";
import styled from "@emotion/styled";

import Font from "components/Font.tsx";
import Input from "components/Input.tsx";
import Button from "components/Button.tsx";

import { signInWithRedirect } from "aws-amplify/auth";

import background from "assets/background.svg";
import footer from "./footer.png";
import { useNavigate } from "react-router";

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
  opacity: 0.6;
  aspect-ratio: 3309 / 1127;
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
      <Content>
        <h1>
          <Font.Title80 text="Stonetop" />
        </h1>
        <Button.Primary type="submit" text="Log In" onClick={handleLogin} />
      </Content>
      <Footer src={footer} alt="" />
    </Page>
  );
};

export default Login;

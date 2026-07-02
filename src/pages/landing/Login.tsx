import { use, useState } from "react";
import styled from "@emotion/styled";

import Font from "components/Font.tsx";
import Input from "components/Input.tsx";
import Button from "components/Button.tsx";

import { fetchAuthSession, getCurrentUser, signInWithRedirect } from "aws-amplify/auth";

import background from "assets/background.png";
import footer from "./footer.png";
import { useNavigate } from "react-router";

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

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        <Button type="submit" text="Log In" onClick={handleLogin} />
      </Content>
      <Footer src={footer} alt="" />
    </Page>
  );
};

export default Login;

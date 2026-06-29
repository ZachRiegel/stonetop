import { useState } from "react";
import styled from "@emotion/styled";

import Text from "components/Text";
import Input from "components/Input";
import Button from "components/Button";

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

const Login = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 280px;
  padding: 24px;
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

  const handleLogin = () => {
    // TODO: wire up authentication
    console.log("Log in", { username, password });
  };

  return (
    <Page>
      <Content>
        <h1>
          <Text.Title80 text="Stonetop" />
        </h1>
        <Login
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <Input placeholder="Username" value={username} onChange={setUsername} />
          <Input placeholder="Password" type="password" value={password} onChange={setPassword} />
          <Button type="submit" text="Log In" />
        </Login>
      </Content>
      <Footer src={footer} alt="" />
    </Page>
  );
};

export default Landing;

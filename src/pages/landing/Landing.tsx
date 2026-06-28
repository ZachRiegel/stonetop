import styled from "@emotion/styled";

import Text from "../../components/Text";

import background from "../../assets/background.png";
import footer from "./footer.png";

const Page = styled.div`
  display: flow-root;
  min-width: 100vw;
  min-height: 100vh;
  background-image: url(${background});
  background-size: auto;
`;

const Footer = styled.img`
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  mix-blend-mode: screen;
  opacity: 0.6;
`;

const Landing = () => (
  <Page>
    <div className="app">
      <h1>
        <Text.Bold32 text="Bun + React" />
      </h1>
      <p>
        <Text.Normal16 text="Edit " />
        <code>
          <Text.Semibold16 text="src/App.tsx" />
        </code>
        <Text.Normal16 text=" and save to test HMR" />
      </p>
    </div>
    <Footer src={footer} alt="" />
  </Page>
);

export default Landing;

import styled from "@emotion/styled";
import Font from "components/Font.tsx";

const Page = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
`;

const CampaignSection = ({ title }: { title: string }) => (
  <Page>
    <Font.Title40 element="h1" text={title} />
  </Page>
);

export default CampaignSection;

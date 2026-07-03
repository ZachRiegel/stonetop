import styled from "@emotion/styled";

const ButtonRow = styled.div`
  display: grid;
  grid-auto-columns: minmax(max-content, 1fr);
  grid-auto-flow: column;
  grid-column-gap: 12px;

  & > * {
    width: 100%;
  }
`;

export default ButtonRow;

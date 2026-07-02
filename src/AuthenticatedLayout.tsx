import { fetchUserAttributes } from "aws-amplify/auth";
import styled from "@emotion/styled";
import { use } from "react";
import Font from "./components/Font.tsx";
import { Outlet } from "react-router";

const cachePromise = <T,>(fn: () => Promise<T>) => {
  let promise: Promise<T> | undefined;
  return () => (promise ??= fn());
};

const cachedFetchUserAttributes = cachePromise(fetchUserAttributes);

const Header = styled.div`
  position: fixed;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  min-width: 200px;
  max-width: 200px;

  &:hover {
    background-color: var(--neutral-100);
  }
`;

const Avatar = styled.img`
  width: 30px;
  height: 30px;
  border-radius: 999px;
  object-fit: cover;
`;

const PageHeader = () => {
  const user = use(cachedFetchUserAttributes());

  return (
    <Header>
      {user.picture && <Avatar src={user.picture} alt={user.name ?? ""} />}
      <Font.Semibold20 element="div" text={user.name ?? ""} />
    </Header>
  );
};

const AuthenticatedLayout = () => (
  <>
    <PageHeader />
    <Outlet />
  </>
);

export default AuthenticatedLayout;

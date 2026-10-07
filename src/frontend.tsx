/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is referenced from `index.html`.
 */

import { Amplify } from "aws-amplify";
import { createRoot } from "react-dom/client";

import outputs from "../amplify_outputs.json";
import { App } from "./App.tsx";

// Omit the identity pool: nothing here uses IAM/guest credentials, and with it
// configured every GraphQL op's fetchAuthSession eagerly round-trips to
// cognito-identity for credentials that get thrown away.
const { identity_pool_id: _, ...auth } = outputs.auth;
Amplify.configure({ ...outputs, auth });

const elem = document.getElementById("root")!;
createRoot(elem).render(<App />);

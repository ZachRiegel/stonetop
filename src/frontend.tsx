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

Amplify.configure(outputs);

const elem = document.getElementById("root")!;
createRoot(elem).render(<App />);

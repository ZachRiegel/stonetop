import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// /api/auth/* — sign-in, OAuth callbacks, session, sign-out
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;

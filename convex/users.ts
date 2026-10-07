import { query } from "./_generated/server";
import { requireUser } from "./lib/access";
import schema from "./schema";

export const me = query({
  args: {},
  returns: schema.doc("users"),
  handler: requireUser,
});

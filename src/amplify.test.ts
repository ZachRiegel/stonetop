import { act, cleanup, renderHook } from "@testing-library/react";
import { defineQuery, query, type QueryResult, useObserveQuery } from "amplify.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake AppSync: every observeQuery subscription is recorded here so tests can
// inspect the options it was created with and push snapshots into it. Lives in
// vi.hoisted because the vi.mock factories below are hoisted above imports.
const harness = vi.hoisted(() => {
  type HoistedSub = {
    model: string;
    // observeQuery, or one of the event streams a windowed query listens to
    operation: "observeQuery" | "onCreate" | "onUpdate" | "onDelete";
    options: { selectionSet?: string[]; filter?: unknown };
    next: (payload: { items: unknown[] } | unknown) => void;
    error: (error: unknown) => void;
    unsubscribed: boolean;
  };
  type IndexCall = {
    model: string;
    queryField: string;
    input: Record<string, unknown>;
    options: Record<string, unknown>;
    resolve: (data: unknown[]) => void;
    reject: (error: unknown) => void;
  };
  const subs: HoistedSub[] = [];
  const indexCalls: IndexCall[] = [];
  const state = {
    subs,
    indexCalls,
    // when set, subscribe() delivers a first snapshot synchronously, before
    // the subscription handle is even returned to the caller
    syncItems: undefined as ((model: string) => unknown[] | undefined) | undefined,
    reset: () => {
      subs.length = 0;
      indexCalls.length = 0;
      state.syncItems = undefined;
    },
    client: {
      models: new Proxy(
        {},
        {
          get: (_target, model) =>
            new Proxy(
              {},
              {
                get: (_model, operation) => {
                  const stream =
                    (op: HoistedSub["operation"]) =>
                    (options: HoistedSub["options"] = {}) => ({
                      subscribe: (handlers: Pick<HoistedSub, "next" | "error">) => {
                        const sub: HoistedSub = {
                          model: String(model),
                          operation: op,
                          options,
                          ...handlers,
                          unsubscribed: false,
                        };
                        subs.push(sub);
                        const items = op === "observeQuery" && state.syncItems?.(sub.model);
                        if (items) handlers.next({ items });
                        return {
                          unsubscribe: () => {
                            sub.unsubscribed = true;
                          },
                        };
                      },
                    });
                  if (
                    operation === "observeQuery" ||
                    operation === "onCreate" ||
                    operation === "onUpdate" ||
                    operation === "onDelete"
                  )
                    return stream(operation);
                  // anything else is a secondary-index query field
                  return (input: Record<string, unknown>, options: Record<string, unknown>) =>
                    new Promise<{ data: unknown[] }>((resolve, reject) => {
                      indexCalls.push({
                        model: String(model),
                        queryField: String(operation),
                        input,
                        options,
                        resolve: (data) => resolve({ data }),
                        reject,
                      });
                    });
                },
              },
            ),
        },
      ),
    },
  };
  return state;
});

// Real relationships from amplify_outputs, plus one secondary index the schema
// doesn't (yet) declare so the windowed strategy can be exercised
vi.mock("aws-amplify", async () => {
  const { default: outputs } = await import("../amplify_outputs.json");
  const { models } = outputs.data.model_introspection;
  return {
    Amplify: {
      getConfig: () => ({
        API: {
          GraphQL: {
            modelIntrospection: {
              ...outputs.data.model_introspection,
              models: {
                ...models,
                Character: {
                  ...models.Character,
                  attributes: [
                    {
                      type: "key",
                      properties: {
                        name: "charactersByCampaignIdAndUpdatedAt",
                        queryField: "listCharacterByCampaignIdAndUpdatedAt",
                        fields: ["campaignId", "updatedAt"],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      }),
    },
  };
});
vi.mock("aws-amplify/data", () => ({ generateClient: () => harness.client }));
vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: () => Promise.resolve({ userId: "test-user", username: "test-user" }),
}));

// React act() refuses to run outside a configured test environment; RTL only
// sets this flag itself when test globals exist, which this file avoids.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type FakeSub = (typeof harness.subs)[number];

const live = () => harness.subs.filter((sub) => !sub.unsubscribed);

// everything but the one unfiltered onUpdate each observed model keeps open
const queries = () => harness.subs.filter((sub) => sub.operation !== "onUpdate");
const liveQueries = () => queries().filter((sub) => !sub.unsubscribed);

const latestSub = (): FakeSub => {
  const sub = queries().at(-1);
  if (!sub) throw new Error("no subscriptions yet");
  return sub;
};

const emit = (sub: FakeSub, items: unknown[]) => act(() => sub.next({ items }));

const eventSub = (operation: FakeSub["operation"]): FakeSub => {
  const sub = live().find((candidate) => candidate.operation === operation);
  if (!sub) throw new Error(`no live ${operation} subscription`);
  return sub;
};

const fireEvent = (operation: FakeSub["operation"], item: unknown) =>
  act(() => eventSub(operation).next(item));

const latestIndexCall = () => {
  const call = harness.indexCalls.at(-1);
  if (!call) throw new Error("no index queries yet");
  return call;
};

// let the fetch loop's await settle and React flush
const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

const resolveIndex = async (data: unknown[]) => {
  latestIndexCall().resolve(data);
  await flush();
};

const campaignById = defineQuery((id: string | undefined) =>
  query({ Campaign: { where: { id } } }),
);
const campaignsByIds = defineQuery((...ids: string[]) =>
  query({ Campaign: { where: { or: ids.map((id) => ({ id: { eq: id } })) } } }),
);
// belongsTo via campaignId, resolved from the schema
const characterWithCampaign = defineQuery((id: string) =>
  query({ Character: { where: { id }, campaign: true } }),
);
const membersWithProfiles = defineQuery((campaignId: string) =>
  query({ CampaignMember: { where: { campaignId }, userProfile: true } }),
);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  // fire every teardown linger so channels fully drain between tests
  act(() => vi.advanceTimersByTime(1000));
  const leaked = live().length;
  harness.reset();
  vi.useRealTimers();
  expect(leaked).toBe(0);
});

describe("query and defineQuery", () => {
  it("defineQuery returns the same query object for the same args", () => {
    const def = defineQuery((id: string) => query({ Campaign: { where: { id } } }));
    expect(def("x")).toBe(def("x"));
    expect(def("y")).not.toBe(def("x"));
  });

  it("normalizes the where shorthand into a filter", () => {
    const filtered = query({ Campaign: { where: { name: "t2" } } });
    expect(filtered).toMatchObject({
      model: "Campaign",
      filter: { name: { eq: "t2" } },
      skip: false,
    });
    expect(filtered.select).toBeUndefined();
    expect(filtered.join).toEqual({});
    expect(query({ Campaign: { where: { name: { beginsWith: "t" } } } }).filter).toEqual({
      name: { beginsWith: "t" },
    });
    expect(query({ Campaign: {} }).filter).toBeUndefined();
    expect(query({ Campaign: { where: { id: undefined } } }).skip).toBe(true);
  });

  it("rejects a limit without an orderBy and a tree without exactly one root", () => {
    expect(() => query({ Campaign: { limit: 3 } })).toThrow(/limit needs an orderBy/);
    expect(() => query({})).toThrow(/exactly one root/);
  });

  it("separates options from relationship entries and hand-written joins", () => {
    const full = query({
      Character: {
        select: ["id", "name"],
        where: { campaignId: "c" },
        orderBy: { level: "desc" },
        limit: 3,
        campaign: true,
        user: { select: ["id"] },
        joins: { extra: { from: (row) => row.id, query: () => query({ Campaign: {} }) } },
      },
    });
    expect(full.select).toEqual(["id", "name"]);
    expect(full.orderBy).toEqual({ level: "desc" });
    expect(full.limit).toBe(3);
    expect(Object.keys(full.join ?? {})).toEqual(["campaign", "user", "extra"]);
    expect(full.join?.campaign).toBe(true);
    expect(full.join?.user).toEqual({ select: ["id"] });
  });
});

describe("basic flow and filter parsing", () => {
  it("returns undefined until the first snapshot, subscribing with an eq filter", () => {
    const { result } = renderHook(() => useObserveQuery(campaignById, "t3-a"));
    expect(result.current).toBeUndefined();
    expect(latestSub().model).toBe("Campaign");
    expect(latestSub().options.filter).toEqual({ id: { eq: "t3-a" } });
    emit(latestSub(), [{ id: "t3-a", name: "one" }]);
    expect(result.current).toEqual([{ id: "t3-a", name: "one" }]);
  });

  it("delivers a snapshot that arrives synchronously on subscribe", () => {
    harness.syncItems = () => [{ id: "t4-a", name: "sync" }];
    const { result } = renderHook(() => useObserveQuery(campaignById, "t4-a"));
    expect(result.current).toEqual([{ id: "t4-a", name: "sync" }]);
  });

  it("subscribes to nothing while a where value is undefined", () => {
    const { result } = renderHook(() => useObserveQuery(campaignById, undefined));
    expect(harness.subs).toHaveLength(0);
    expect(result.current).toBeUndefined();
  });

  it("dedups and sorts an or-of-id-eq filter", () => {
    renderHook(() => useObserveQuery(campaignsByIds, "t5-b", "t5-a", "t5-b"));
    expect(latestSub().options.filter).toEqual({
      or: [{ id: { eq: "t5-a" } }, { id: { eq: "t5-b" } }],
    });
  });

  it("keys channels on any single eq field and narrows each consumer to its value", () => {
    const charactersByCampaign = defineQuery((campaignId: string) =>
      query({ Character: { where: { campaignId } } }),
    );
    const first = renderHook(() => useObserveQuery(charactersByCampaign, "t6-a"));
    expect(latestSub().options.filter).toEqual({ campaignId: { eq: "t6-a" } });
    const second = renderHook(() => useObserveQuery(charactersByCampaign, "t6-b"));
    const union = latestSub();
    expect(union.options.filter).toEqual({
      or: [{ campaignId: { eq: "t6-a" } }, { campaignId: { eq: "t6-b" } }],
    });
    emit(union, [
      { id: "t6-1", campaignId: "t6-a" },
      { id: "t6-2", campaignId: "t6-b" },
      { id: "t6-3", campaignId: "t6-a" },
    ]);
    expect(liveQueries()).toHaveLength(1);
    expect(first.result.current?.map((row) => row.id)).toEqual(["t6-1", "t6-3"]);
    expect(second.result.current?.map((row) => row.id)).toEqual(["t6-2"]);
  });

  it("passes an or-clause that is not on a single field through verbatim", () => {
    const mixed = defineQuery((id: string, name: string) =>
      query({ Campaign: { where: { or: [{ id: { eq: id } }, { name: { eq: name } }] } } }),
    );
    renderHook(() => useObserveQuery(mixed, "t25-a", "t25-n"));
    expect(latestSub().options.filter).toEqual({
      or: [{ id: { eq: "t25-a" } }, { name: { eq: "t25-n" } }],
    });
  });

  it("keys on id first and composes an and-filter with the remaining clauses", () => {
    const characterInCampaign = defineQuery((id: string, campaignId: string) =>
      query({ Character: { where: { campaignId, id } } }),
    );
    renderHook(() => useObserveQuery(characterInCampaign, "t7-a", "t7-c"));
    expect(latestSub().options.filter).toEqual({
      and: [{ campaignId: { eq: "t7-c" } }, { id: { eq: "t7-a" } }],
    });
  });

  it("sends an explicit select as selectionSet and keys channels on it", () => {
    const campaignNames = defineQuery((id: string) =>
      query({ Campaign: { select: ["id", "name"], where: { id } } }),
    );
    renderHook(() => useObserveQuery(campaignNames, "t8-a"));
    expect(latestSub().options.selectionSet).toEqual(["id", "name", "updatedAt"]);
    renderHook(() => useObserveQuery(campaignById, "t8-a"));
    expect(liveQueries()).toHaveLength(2);
    expect(latestSub().options.selectionSet).toBeUndefined();
  });

  it("orders the live set client-side, slicing to limit when no index serves it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const topCampaigns = defineQuery(() =>
      query({ Campaign: { orderBy: { name: "desc" }, limit: 2 } }),
    );
    const { result } = renderHook(() => useObserveQuery(topCampaigns));
    expect(latestSub().operation).toBe("observeQuery");
    expect(warn).toHaveBeenCalledOnce();
    emit(latestSub(), [
      { id: "t26-1", name: "b" },
      { id: "t26-2", name: "c" },
      { id: "t26-3", name: "a" },
    ]);
    expect(result.current?.map((row) => row.name)).toEqual(["c", "b"]);
    warn.mockRestore();
  });
});

describe("channel sharing and physical subscriptions", () => {
  it("shares one channel across consumers and replaces the physical make-before-break", () => {
    const first = renderHook(() => useObserveQuery(campaignById, "t9-a"));
    const initial = latestSub();
    emit(initial, [{ id: "t9-a", name: "a" }]);
    expect(first.result.current).toEqual([{ id: "t9-a", name: "a" }]);

    const second = renderHook(() => useObserveQuery(campaignById, "t9-b"));
    // union physical is in flight; the old one must stay live until it lands
    expect(liveQueries()).toHaveLength(2);
    const union = latestSub();
    expect(union.options.filter).toEqual({
      or: [{ id: { eq: "t9-a" } }, { id: { eq: "t9-b" } }],
    });
    expect(second.result.current).toBeUndefined();
    expect(first.result.current).toEqual([{ id: "t9-a", name: "a" }]);

    emit(union, [
      { id: "t9-a", name: "a" },
      { id: "t9-b", name: "b" },
    ]);
    expect(initial.unsubscribed).toBe(true);
    expect(first.result.current).toEqual([{ id: "t9-a", name: "a" }]);
    expect(second.result.current).toEqual([{ id: "t9-b", name: "b" }]);
  });

  it("keeps a covering physical when the wanted values narrow", () => {
    renderHook(() => useObserveQuery(campaignById, "t10-a"));
    const second = renderHook(() => useObserveQuery(campaignById, "t10-b"));
    emit(latestSub(), [
      { id: "t10-a", name: "a" },
      { id: "t10-b", name: "b" },
    ]);
    expect(liveQueries()).toHaveLength(1);
    second.unmount();
    const subCount = harness.subs.length;
    const third = renderHook(() => useObserveQuery(campaignById, "t10-a"));
    expect(harness.subs.length).toBe(subCount);
    expect(third.result.current).toEqual([{ id: "t10-a", name: "a" }]);
  });

  it("subscribes broad when the value union blows the AppSync filter budget", () => {
    const ids = Array.from({ length: 11 }, (_, index) => `t11-${String(index).padStart(2, "0")}`);
    const { result } = renderHook(() => useObserveQuery(campaignsByIds, ...ids));
    expect(latestSub().options.filter).toBeUndefined();
    emit(latestSub(), [...ids.map((id) => ({ id, name: id })), { id: "t11-zz", name: "stranger" }]);
    expect(result.current?.map((row) => row.id)).toEqual(ids);
  });

  it("keeps one unfiltered onUpdate per model and releases it with the last channel", () => {
    const first = renderHook(() => useObserveQuery(campaignById, "t33-a"));
    const second = renderHook(() => useObserveQuery(campaignsByIds, "t33-b", "t33-c"));
    const watches = live().filter((sub) => sub.operation === "onUpdate");
    expect(watches).toHaveLength(1);
    expect(watches[0]?.options).toEqual({});
    first.unmount();
    second.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(watches[0]?.unsubscribed).toBe(true);
  });
});

describe("scope changes", () => {
  const charactersByCampaign = defineQuery((campaignId: string) =>
    query({ Character: { where: { campaignId } } }),
  );

  it("drops a row whose update moved it out of the filter", () => {
    const { result } = renderHook(() => useObserveQuery(charactersByCampaign, "t34-a"));
    emit(latestSub(), [
      { id: "t34-1", campaignId: "t34-a" },
      { id: "t34-2", campaignId: "t34-a", updatedAt: "1" },
    ]);
    // AppSync's filtered onUpdate stays silent; the model watch hears it
    fireEvent("onUpdate", { id: "t34-2", campaignId: "t34-elsewhere", updatedAt: "2" });
    expect(result.current?.map((row) => row.id)).toEqual(["t34-1"]);
    // Amplify's observeQuery still holds the version it listed and re-sends
    // it with its next snapshot; the older updatedAt keeps it out
    emit(latestSub(), [
      { id: "t34-1", campaignId: "t34-a" },
      { id: "t34-2", campaignId: "t34-a", updatedAt: "1" },
      { id: "t34-3", campaignId: "t34-a" },
    ]);
    expect(result.current?.map((row) => row.id)).toEqual(["t34-1", "t34-3"]);
  });

  it("admits a row whose update moved it into the filter, across later snapshots", () => {
    const { result } = renderHook(() => useObserveQuery(charactersByCampaign, "t35-a"));
    emit(latestSub(), [{ id: "t35-1", campaignId: "t35-a" }]);
    fireEvent("onUpdate", { id: "t35-2", campaignId: "t35-a", name: "moved in" });
    expect(result.current?.map((row) => row.id)).toEqual(["t35-1", "t35-2"]);
    emit(latestSub(), [
      { id: "t35-1", campaignId: "t35-a" },
      { id: "t35-3", campaignId: "t35-a" },
    ]);
    expect(result.current?.map((row) => row.id)).toEqual(["t35-1", "t35-3", "t35-2"]);
    fireEvent("onUpdate", { id: "t35-2", campaignId: "t35-b" });
    expect(result.current?.map((row) => row.id)).toEqual(["t35-1", "t35-3"]);
  });

  it("narrows shared-channel consumers by their own values on an update", () => {
    const first = renderHook(() => useObserveQuery(charactersByCampaign, "t36-a"));
    const second = renderHook(() => useObserveQuery(charactersByCampaign, "t36-b"));
    emit(latestSub(), [{ id: "t36-1", campaignId: "t36-a" }]);
    fireEvent("onUpdate", { id: "t36-1", campaignId: "t36-b" });
    expect(first.result.current).toEqual([]);
    expect(second.result.current?.map((row) => row.id)).toEqual(["t36-1"]);
  });

  it("evaluates the filter operators AppSync supports and keeps rows it cannot judge", () => {
    const seasoned = defineQuery((campaignId: string) =>
      query({
        Character: {
          where: { campaignId, level: { ge: 3 }, name: { beginsWith: "A" }, class: { ne: "FOX" } },
        },
      }),
    );
    const { result } = renderHook(() => useObserveQuery(seasoned, "t37-a"));
    emit(latestSub(), [
      { id: "t37-1", campaignId: "t37-a", level: 5, name: "Ash", class: "HEAVY" },
    ]);
    fireEvent("onUpdate", {
      id: "t37-1",
      campaignId: "t37-a",
      level: 2,
      name: "Ash",
      class: "HEAVY",
    });
    expect(result.current).toEqual([]);
    fireEvent("onUpdate", {
      id: "t37-1",
      campaignId: "t37-a",
      level: 4,
      name: "Ash",
      class: "HEAVY",
    });
    expect(result.current?.map((row) => row.level)).toEqual([4]);
    fireEvent("onUpdate", {
      id: "t37-1",
      campaignId: "t37-a",
      level: 4,
      name: "Bo",
      class: "HEAVY",
    });
    expect(result.current).toEqual([]);
    // a row that doesn't carry a filtered field can't be judged and stays
    const partial = defineQuery((campaignId: string) =>
      query({ Character: { select: ["id", "name"], where: { campaignId, level: { ge: 3 } } } }),
    );
    const narrow = renderHook(() => useObserveQuery(partial, "t37-z"));
    emit(latestSub(), [{ id: "t37-9", name: "Zed" }]);
    expect(narrow.result.current?.map((row) => row.id)).toEqual(["t37-9"]);
  });
});

describe("row cache", () => {
  it("re-emits fresher row data seen by another channel, preserving unchanged identities", () => {
    const characterById = defineQuery((id: string) => query({ Character: { where: { id } } }));
    const charactersByCampaign = defineQuery((campaignId: string) =>
      query({ Character: { where: { campaignId } } }),
    );
    const byId = renderHook(() => useObserveQuery(characterById, "t12-r1"));
    const byIdSub = latestSub();
    const byCampaign = renderHook(() => useObserveQuery(charactersByCampaign, "t12-c"));
    const byCampaignSub = latestSub();

    emit(byIdSub, [{ id: "t12-r1", campaignId: "t12-c", name: "old" }]);
    expect(byId.result.current?.[0]?.name).toBe("old");

    emit(byCampaignSub, [
      { id: "t12-r1", campaignId: "t12-c", name: "new" },
      { id: "t12-r2", campaignId: "t12-c", name: "two" },
    ]);
    expect(byId.result.current?.[0]?.name).toBe("new");
    expect(byCampaign.result.current?.map((row) => row.name)).toEqual(["new", "two"]);

    const stable = byId.result.current?.[0];
    emit(byCampaignSub, [
      { id: "t12-r1", campaignId: "t12-c", name: "new" },
      { id: "t12-r2", campaignId: "t12-c", name: "two-b" },
    ]);
    expect(byId.result.current?.[0]).toBe(stable);
  });

  it("swallows a value-identical snapshot without re-rendering", () => {
    // nested selections arrive as fresh arrays each snapshot, so the row
    // comparison has to be structural rather than by field identity
    const campaignWithCharacters = defineQuery((id: string) =>
      query({ Campaign: { select: ["id", "name", "characters.*"], where: { id } } }),
    );
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useObserveQuery(campaignWithCharacters, "t13-a");
    });
    const snapshot = () => [
      { id: "t13-a", name: "same", characters: [{ id: "t13-c", name: "c" }] },
    ];
    emit(latestSub(), snapshot());
    const settled = { renders, rows: result.current };
    emit(latestSub(), snapshot());
    expect(renders).toBe(settled.renders);
    expect(result.current).toBe(settled.rows);
  });
});

describe("lifecycle, linger, and StrictMode", () => {
  it("resets to undefined and resubscribes when the hook args change", () => {
    const { result, rerender } = renderHook(({ id }) => useObserveQuery(campaignById, id), {
      initialProps: { id: "t14-a" },
    });
    const initial = latestSub();
    emit(initial, [{ id: "t14-a", name: "a" }]);
    expect(result.current).toEqual([{ id: "t14-a", name: "a" }]);

    rerender({ id: "t14-b" });
    expect(result.current).toBeUndefined();
    const replacement = latestSub();
    expect(replacement.options.filter).toEqual({ id: { eq: "t14-b" } });
    emit(replacement, [{ id: "t14-b", name: "b" }]);
    expect(result.current).toEqual([{ id: "t14-b", name: "b" }]);
    expect(initial.unsubscribed).toBe(true);
  });

  it("reuses the channel when remounted within the teardown linger", () => {
    const first = renderHook(() => useObserveQuery(campaignById, "t15-a"));
    emit(latestSub(), [{ id: "t15-a", name: "a" }]);
    first.unmount();
    expect(latestSub().unsubscribed).toBe(false);

    act(() => vi.advanceTimersByTime(999));
    const second = renderHook(() => useObserveQuery(campaignById, "t15-a"));
    expect(queries()).toHaveLength(1);
    expect(second.result.current).toEqual([{ id: "t15-a", name: "a" }]);
    act(() => vi.advanceTimersByTime(1000));
    expect(latestSub().unsubscribed).toBe(false);
  });

  it("tears the channel down once the linger expires", () => {
    const first = renderHook(() => useObserveQuery(campaignById, "t16-a"));
    emit(latestSub(), [{ id: "t16-a", name: "a" }]);
    first.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(latestSub().unsubscribed).toBe(true);

    const second = renderHook(() => useObserveQuery(campaignById, "t16-a"));
    expect(queries()).toHaveLength(2);
    expect(second.result.current).toBeUndefined();
  });

  it("survives a StrictMode double-effect with a single physical subscription", () => {
    const { result } = renderHook(() => useObserveQuery(campaignById, "t17-a"), {
      reactStrictMode: true,
    });
    expect(queries()).toHaveLength(1);
    emit(latestSub(), [{ id: "t17-a", name: "a" }]);
    expect(result.current).toEqual([{ id: "t17-a", name: "a" }]);
  });
});

describe("join trees", () => {
  it("follows a belongsTo relationship, gating emission until the child delivers", () => {
    const { result } = renderHook(() => useObserveQuery(characterWithCampaign, "t18-ch"));
    const rootSub = latestSub();
    emit(rootSub, [{ id: "t18-ch", campaignId: "t18-camp" }]);
    expect(result.current).toBeUndefined();

    const childSub = latestSub();
    expect(childSub.model).toBe("Campaign");
    expect(childSub.options.filter).toEqual({ id: { eq: "t18-camp" } });
    emit(childSub, [{ id: "t18-camp", name: "camp" }]);
    expect(result.current?.[0]?.campaign).toEqual({ id: "t18-camp", name: "camp" });

    emit(childSub, []);
    expect(result.current?.[0]?.campaign).toBeNull();
  });

  it("follows a hasMany relationship narrowed by where, grouping children by the foreign key", () => {
    const profilesWithCharacters = defineQuery((campaignId: string, ...ids: string[]) =>
      query({
        UserProfile: {
          where: { or: ids.map((id) => ({ id: { eq: id } })) },
          characters: { where: { campaignId }, orderBy: { name: "asc" } },
        },
      }),
    );
    const { result } = renderHook(() =>
      useObserveQuery(profilesWithCharacters, "t27-c", "t27-p1", "t27-p2"),
    );
    emit(latestSub(), [{ id: "t27-p1" }, { id: "t27-p2" }]);
    const childSub = latestSub();
    expect(childSub.model).toBe("Character");
    expect(childSub.options.filter).toEqual({
      and: [
        { campaignId: { eq: "t27-c" } },
        { or: [{ userProfileId: { eq: "t27-p1" } }, { userProfileId: { eq: "t27-p2" } }] },
      ],
    });
    emit(childSub, [
      { id: "t27-z", userProfileId: "t27-p1", name: "zed" },
      { id: "t27-b", userProfileId: "t27-p2", name: "bee" },
      { id: "t27-a", userProfileId: "t27-p1", name: "ay" },
    ]);
    expect(result.current?.map((profile) => profile.characters.map((c) => c.name))).toEqual([
      ["ay", "zed"],
      ["bee"],
    ]);
  });

  it("drops the per-parent clause past the AppSync budget and narrows client-side", () => {
    const ids = Array.from({ length: 11 }, (_, index) => `t28-p${String(index).padStart(2, "0")}`);
    const profilesWithCharacters = defineQuery((campaignId: string) =>
      query({ UserProfile: { characters: { where: { campaignId } } } }),
    );
    const { result } = renderHook(() => useObserveQuery(profilesWithCharacters, "t28-c"));
    emit(
      latestSub(),
      ids.map((id) => ({ id })),
    );
    const childSub = latestSub();
    expect(childSub.options.filter).toEqual({ campaignId: { eq: "t28-c" } });
    emit(childSub, [
      { id: "t28-x", userProfileId: ids[0] },
      { id: "t28-y", userProfileId: "t28-stranger" },
    ]);
    expect(result.current?.[0]?.characters.map((c) => c.id)).toEqual(["t28-x"]);
    expect(result.current?.slice(1).every((profile) => profile.characters.length === 0)).toBe(true);
  });

  it("nests relationship entries", () => {
    const membersDeep = defineQuery((campaignId: string) =>
      query({ CampaignMember: { where: { campaignId }, userProfile: { characters: true } } }),
    );
    const { result } = renderHook(() => useObserveQuery(membersDeep, "t29-c"));
    emit(latestSub(), [{ id: "t29-m", campaignId: "t29-c", userProfileId: "t29-p" }]);
    const profileSub = latestSub();
    expect(profileSub.model).toBe("UserProfile");
    emit(profileSub, [{ id: "t29-p", name: "P" }]);
    const characterSub = latestSub();
    expect(characterSub.model).toBe("Character");
    expect(characterSub.options.filter).toEqual({ userProfileId: { eq: "t29-p" } });
    emit(characterSub, [{ id: "t29-ch", userProfileId: "t29-p" }]);
    expect(result.current).toEqual([
      {
        id: "t29-m",
        campaignId: "t29-c",
        userProfileId: "t29-p",
        userProfile: {
          id: "t29-p",
          name: "P",
          characters: [{ id: "t29-ch", userProfileId: "t29-p" }],
        },
      },
    ]);
  });

  it("groups hand-written many-join children by match key and exposes ctx.root", () => {
    let capturedCtx: { root: ReadonlyArray<unknown> } | undefined;
    const campaignWithCharacters = defineQuery((id: string) =>
      query({
        Campaign: {
          where: { id },
          joins: {
            byRoot: {
              many: true,
              from: (row) => row.id,
              match: (child) => child.campaignId,
              query: (ids, ctx) => {
                capturedCtx = ctx;
                return query({ Character: { where: { campaignId: ids[0] } } });
              },
            },
          },
        },
      }),
    );
    const { result } = renderHook(() => useObserveQuery(campaignWithCharacters, "t19-camp"));
    emit(latestSub(), [{ id: "t19-camp", name: "camp" }]);
    expect(result.current).toBeUndefined();

    const childSub = latestSub();
    expect(childSub.model).toBe("Character");
    expect(childSub.options.filter).toEqual({ campaignId: { eq: "t19-camp" } });
    emit(childSub, [
      { id: "t19-ch1", campaignId: "t19-camp" },
      { id: "t19-ch2", campaignId: "t19-camp" },
    ]);
    expect(result.current?.[0]?.byRoot).toEqual([
      { id: "t19-ch1", campaignId: "t19-camp" },
      { id: "t19-ch2", campaignId: "t19-camp" },
    ]);
    expect(capturedCtx?.root).toEqual([{ id: "t19-camp", name: "camp" }]);
  });

  it("emits a null relation without subscribing when the foreign key is empty", () => {
    const { result } = renderHook(() => useObserveQuery(characterWithCampaign, "t20-ch"));
    emit(latestSub(), [{ id: "t20-ch", campaignId: null }]);
    expect(queries()).toHaveLength(1);
    expect(result.current).toEqual([{ id: "t20-ch", campaignId: null, campaign: null }]);
  });

  it("updates an unchanged child channel in place when the root rows shrink", () => {
    const { result } = renderHook(() => useObserveQuery(membersWithProfiles, "t21-c"));
    const rootSub = latestSub();
    emit(rootSub, [
      { id: "t21-m1", campaignId: "t21-c", userProfileId: "t21-p1" },
      { id: "t21-m2", campaignId: "t21-c", userProfileId: "t21-p2" },
    ]);
    const childSub = latestSub();
    expect(childSub.options.filter).toEqual({
      or: [{ id: { eq: "t21-p1" } }, { id: { eq: "t21-p2" } }],
    });
    emit(childSub, [
      { id: "t21-p1", name: "P1" },
      { id: "t21-p2", name: "P2" },
    ]);
    expect(result.current).toHaveLength(2);

    const subCount = harness.subs.length;
    emit(rootSub, [{ id: "t21-m1", campaignId: "t21-c", userProfileId: "t21-p1" }]);
    expect(harness.subs.length).toBe(subCount);
    expect(result.current).toEqual([
      {
        id: "t21-m1",
        campaignId: "t21-c",
        userProfileId: "t21-p1",
        userProfile: { id: "t21-p1", name: "P1" },
      },
    ]);
  });

  it("stays gated when the root expands while the join child is still loading", () => {
    const { result } = renderHook(() => useObserveQuery(membersWithProfiles, "t24-c"));
    const rootSub = latestSub();
    emit(rootSub, [{ id: "t24-m1", campaignId: "t24-c", userProfileId: "t24-A" }]);
    const staleChild = latestSub();
    expect(staleChild.options.filter).toEqual({ id: { eq: "t24-A" } });
    expect(result.current).toBeUndefined();

    // the root derives {A, B} before the A-only child physical delivers; the
    // channel must immediately put a union physical in flight beside it
    emit(rootSub, [
      { id: "t24-m1", campaignId: "t24-c", userProfileId: "t24-A" },
      { id: "t24-m2", campaignId: "t24-c", userProfileId: "t24-B" },
    ]);
    const union = latestSub();
    expect(union).not.toBe(staleChild);
    expect(union.options.filter).toEqual({
      or: [{ id: { eq: "t24-A" } }, { id: { eq: "t24-B" } }],
    });

    // the stale A-only physical resolving must not complete the tree: its
    // snapshot cannot say anything about B
    emit(staleChild, [{ id: "t24-A", name: "A" }]);
    expect(result.current).toBeUndefined();

    emit(union, [
      { id: "t24-A", name: "A" },
      { id: "t24-B", name: "B" },
    ]);
    expect(staleChild.unsubscribed).toBe(true);
    expect(result.current).toEqual([
      {
        id: "t24-m1",
        campaignId: "t24-c",
        userProfileId: "t24-A",
        userProfile: { id: "t24-A", name: "A" },
      },
      {
        id: "t24-m2",
        campaignId: "t24-c",
        userProfileId: "t24-B",
        userProfile: { id: "t24-B", name: "B" },
      },
    ]);
  });

  it("resubscribes a moved join child new-before-old", () => {
    const campaignWithNamedCharacters = defineQuery((id: string) =>
      query({
        Campaign: {
          where: { id },
          joins: {
            byName: {
              many: true,
              from: (row) => row.name,
              match: (child) => child.campaignId,
              query: (ids) => query({ Character: { where: { campaignId: ids[0] } } }),
            },
          },
        },
      }),
    );
    const { result } = renderHook(() => useObserveQuery(campaignWithNamedCharacters, "t22"));
    const rootSub = latestSub();
    emit(rootSub, [{ id: "t22", name: "t22-x" }]);
    const firstChild = latestSub();
    expect(firstChild.options.filter).toEqual({ campaignId: { eq: "t22-x" } });
    emit(firstChild, [{ id: "t22-c1", campaignId: "t22-x" }]);
    expect(result.current?.[0]?.byName).toEqual([{ id: "t22-c1", campaignId: "t22-x" }]);

    emit(rootSub, [{ id: "t22", name: "t22-y" }]);
    const secondChild = latestSub();
    expect(secondChild).not.toBe(firstChild);
    expect(secondChild.options.filter).toEqual({ campaignId: { eq: "t22-y" } });
    // the old child lingers while the replacement warms up
    expect(firstChild.unsubscribed).toBe(false);
    emit(secondChild, [{ id: "t22-c2", campaignId: "t22-y" }]);
    expect(result.current?.[0]?.byName).toEqual([{ id: "t22-c2", campaignId: "t22-y" }]);
    act(() => vi.advanceTimersByTime(1000));
    expect(firstChild.unsubscribed).toBe(true);
  });

  it("logs subscription errors without breaking delivered state", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = renderHook(() => useObserveQuery(campaignById, "t23-a"));
    emit(latestSub(), [{ id: "t23-a", name: "a" }]);
    act(() => latestSub().error(new Error("boom")));
    expect(errorSpy).toHaveBeenCalledWith("observeQuery Campaign failed", expect.any(Error));
    expect(result.current).toEqual([{ id: "t23-a", name: "a" }]);
    errorSpy.mockRestore();
  });
});

describe("windowed queries", () => {
  const recentCharacters = defineQuery((campaignId: string) =>
    query({ Character: { where: { campaignId }, orderBy: { updatedAt: "desc" }, limit: 2 } }),
  );
  const character = (id: string, updatedAt: number, extra: Record<string, unknown> = {}) => ({
    id,
    campaignId: "t30-c",
    updatedAt,
    ...extra,
  });

  const mountWindow = async () => {
    const hook = renderHook(() => useObserveQuery(recentCharacters, "t30-c"));
    await resolveIndex([character("t30-a", 3), character("t30-b", 2)]);
    return hook;
  };

  it("serves a limited query from the matching index and listens for item events", async () => {
    const { result } = renderHook(() => useObserveQuery(recentCharacters, "t30-c"));
    expect(latestIndexCall()).toMatchObject({
      model: "Character",
      queryField: "listCharacterByCampaignIdAndUpdatedAt",
      input: { campaignId: "t30-c" },
      options: { limit: 2, sortDirection: "DESC" },
    });
    expect(
      live()
        .map((sub) => sub.operation)
        .sort(),
    ).toEqual(["onCreate", "onDelete", "onUpdate"]);
    expect(eventSub("onCreate").options.filter).toEqual({ campaignId: { eq: "t30-c" } });
    expect(eventSub("onUpdate").options).toEqual({});
    expect(result.current).toBeUndefined();
    await resolveIndex([character("t30-a", 3), character("t30-b", 2)]);
    expect(result.current?.map((row) => row.id)).toEqual(["t30-a", "t30-b"]);
  });

  it("passes extra where clauses along as the index query's filter", () => {
    const recentHighLevel = defineQuery((campaignId: string) =>
      query({
        Character: {
          where: { campaignId, level: { ge: 5 } },
          orderBy: { updatedAt: "desc" },
          limit: 2,
        },
      }),
    );
    renderHook(() => useObserveQuery(recentHighLevel, "t31-c"));
    expect(latestIndexCall().options.filter).toEqual({ level: { ge: 5 } });
  });

  it("patches an in-window update with an unchanged sort value in place", async () => {
    const { result } = await mountWindow();
    const calls = harness.indexCalls.length;
    fireEvent("onUpdate", character("t30-a", 3, { name: "renamed" }));
    expect(harness.indexCalls.length).toBe(calls);
    expect(result.current?.[0]?.name).toBe("renamed");
  });

  it("ignores events whose item is out of scope or cannot enter a full window", async () => {
    await mountWindow();
    const calls = harness.indexCalls.length;
    fireEvent("onCreate", character("t30-z", 1));
    fireEvent("onUpdate", character("t30-z", 1));
    fireEvent("onUpdate", { id: "t30-other", campaignId: "t30-elsewhere", updatedAt: 99 });
    expect(harness.indexCalls.length).toBe(calls);
  });

  it("refetches when an event could change the window", async () => {
    const { result } = await mountWindow();
    const calls = harness.indexCalls.length;
    fireEvent("onCreate", character("t30-n", 5));
    expect(harness.indexCalls.length).toBe(calls + 1);
    await resolveIndex([character("t30-n", 5), character("t30-a", 3)]);
    expect(result.current?.map((row) => row.id)).toEqual(["t30-n", "t30-a"]);

    // an in-window row whose sort value moved, and a deleted in-window row
    fireEvent("onUpdate", character("t30-a", 9));
    expect(harness.indexCalls.length).toBe(calls + 2);
    await resolveIndex([character("t30-a", 9), character("t30-n", 5)]);
    fireEvent("onDelete", character("t30-n", 5));
    expect(harness.indexCalls.length).toBe(calls + 3);
    await resolveIndex([character("t30-a", 9), character("t30-b", 2)]);
    expect(result.current?.map((row) => row.id)).toEqual(["t30-a", "t30-b"]);
  });

  it("refetches when an update moves a window row out of scope", async () => {
    const { result } = await mountWindow();
    const calls = harness.indexCalls.length;
    fireEvent("onUpdate", { id: "t30-a", campaignId: "t30-elsewhere", updatedAt: 3 });
    expect(harness.indexCalls.length).toBe(calls + 1);
    await resolveIndex([character("t30-b", 2)]);
    expect(result.current?.map((row) => row.id)).toEqual(["t30-b"]);
  });

  it("refetches on any create while the window is not full", async () => {
    const { result } = renderHook(() => useObserveQuery(recentCharacters, "t30-c"));
    await resolveIndex([character("t30-a", 3)]);
    fireEvent("onCreate", character("t30-low", 0));
    await resolveIndex([character("t30-a", 3), character("t30-low", 0)]);
    expect(result.current?.map((row) => row.id)).toEqual(["t30-a", "t30-low"]);
  });

  it("coalesces events that arrive while a refetch is in flight", async () => {
    await mountWindow();
    const calls = harness.indexCalls.length;
    fireEvent("onCreate", character("t30-n1", 5));
    fireEvent("onCreate", character("t30-n2", 6));
    fireEvent("onCreate", character("t30-n3", 7));
    expect(harness.indexCalls.length).toBe(calls + 1);
    await resolveIndex([character("t30-n1", 5), character("t30-a", 3)]);
    // exactly one follow-up fetch for everything that landed mid-flight
    expect(harness.indexCalls.length).toBe(calls + 2);
    await resolveIndex([character("t30-n3", 7), character("t30-n2", 6)]);
    expect(harness.indexCalls.length).toBe(calls + 2);
  });

  it("keeps the last window and retries on the next event when a fetch fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = await mountWindow();
    fireEvent("onCreate", character("t30-n", 5));
    latestIndexCall().reject(new Error("network"));
    await flush();
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(result.current?.map((row) => row.id)).toEqual(["t30-a", "t30-b"]);

    const calls = harness.indexCalls.length;
    fireEvent("onCreate", character("t30-m", 6));
    expect(harness.indexCalls.length).toBe(calls + 1);
    await resolveIndex([character("t30-m", 6), character("t30-n", 5)]);
    expect(result.current?.map((row) => row.id)).toEqual(["t30-m", "t30-n"]);
    errorSpy.mockRestore();
  });

  it("resubscribes a windowed join child when its parent key changes", async () => {
    const campaignWithRecent = defineQuery((id: string) =>
      query({
        Campaign: {
          where: { id },
          joins: {
            recent: {
              many: true,
              from: (row) => row.name,
              match: (child) => child.campaignId,
              query: (ids) =>
                query({
                  Character: {
                    where: { campaignId: ids[0] },
                    orderBy: { updatedAt: "desc" },
                    limit: 2,
                  },
                }),
            },
          },
        },
      }),
    );
    const { result } = renderHook(() => useObserveQuery(campaignWithRecent, "t32"));
    const rootSub = latestSub();
    emit(rootSub, [{ id: "t32", name: "t32-x" }]);
    expect(latestIndexCall().input).toEqual({ campaignId: "t32-x" });
    const firstEvents = liveQueries().filter((sub) => sub.operation !== "observeQuery");
    await resolveIndex([{ id: "t32-c1", campaignId: "t32-x", updatedAt: 1 }]);
    expect(result.current?.[0]?.recent.map((row) => row.id)).toEqual(["t32-c1"]);

    emit(rootSub, [{ id: "t32", name: "t32-y" }]);
    expect(latestIndexCall().input).toEqual({ campaignId: "t32-y" });
    expect(firstEvents.every((sub) => sub.unsubscribed)).toBe(true);
    await resolveIndex([{ id: "t32-c2", campaignId: "t32-y", updatedAt: 1 }]);
    expect(result.current?.[0]?.recent.map((row) => row.id)).toEqual(["t32-c2"]);
  });

  it("re-emits window rows refreshed through another query's cache write", async () => {
    const { result } = await mountWindow();
    const byId = defineQuery((id: string) => query({ Character: { where: { id } } }));
    renderHook(() => useObserveQuery(byId, "t30-b"));
    emit(latestSub(), [character("t30-b", 2, { name: "via cache" })]);
    expect(result.current?.[1]?.name).toBe("via cache");
  });
});

// Compile-time coverage (vitest strips types, so these only bite under tsc):
// explicit selections inside a join tree used to hit TS2589, and nested
// select/orderBy literals used to widen until J's candidate failed its
// constraint and silently collapsed.
describe("typing", () => {
  const selectedTree = defineQuery((campaignId: string) =>
    query({
      CampaignMember: {
        select: ["id", "campaignId", "userProfileId"],
        where: { campaignId },
        campaign: { select: ["id", "name"] },
        userProfile: {
          select: ["id", "name", "picture"],
          characters: { select: ["id", "userProfileId", "level"], where: { campaignId } },
        },
      },
    }),
  );
  type Member = QueryResult<ReturnType<typeof selectedTree>>;

  it("narrows rows to the selected paths at every level of a join tree", () => {
    const member: Member = {
      id: "m",
      campaignId: "c",
      userProfileId: "p",
      campaign: { id: "c", name: "camp" },
      userProfile: {
        id: "p",
        name: "P",
        picture: null,
        characters: [{ id: "ch", userProfileId: "p", level: 1 }],
      },
    };
    // @ts-expect-error not selected on the root
    expect(member.members).toBeUndefined();
    // @ts-expect-error not selected on the single relation
    expect(member.campaign?.owner).toBeUndefined();
    // @ts-expect-error not selected on the nested relation
    expect(member.userProfile?.displayName).toBeUndefined();
    // @ts-expect-error not selected on the many relation
    expect(member.userProfile?.characters[0]?.name).toBeUndefined();
    const picture: string | null = member.userProfile?.picture ?? null;
    expect(picture).toBeNull();
    expect(selectedTree("c").model).toBe("CampaignMember");
  });

  it("types default selections as every scalar field and relation paths as nested rows", () => {
    const campaign: QueryResult<ReturnType<typeof campaignById>> = {
      id: "c",
      name: "n",
      owner: null,
      members: null,
      createdAt: "",
      updatedAt: "",
    };
    // @ts-expect-error relationships are not part of the default selection set
    expect(campaign.characters).toBeUndefined();
    const nested = query({
      Campaign: { select: ["id", "profiles.userProfile.*", "characters.name"] },
    });
    const row: QueryResult<typeof nested> = {
      id: "c",
      profiles: [
        {
          userProfile: {
            id: "p",
            name: null,
            displayName: null,
            picture: null,
            owner: null,
            createdAt: "",
            updatedAt: "",
          },
        },
      ],
      characters: [{ name: "x" }],
    };
    // @ts-expect-error only name was selected under characters
    expect(row.characters[0]?.level).toBeUndefined();
    expect(row.profiles[0]?.userProfile?.id).toBe("p");
    expect(nested.select).toHaveLength(3);
  });

  it("checks every key of the tree against the schema", () => {
    // @ts-expect-error unknown field
    expect(query({ Character: { where: { nope: "x" } } }).skip).toBe(false);
    // @ts-expect-error wrong enum member
    expect(query({ Character: { where: { class: "CAT" } } }).skip).toBe(false);
    // @ts-expect-error relationships are not filterable
    expect(query({ Character: { where: { campaign: "x" } } }).skip).toBe(false);
    // @ts-expect-error relationships are not sortable
    expect(query({ Character: { orderBy: { campaign: "asc" } } }).skip).toBe(false);
    // @ts-expect-error where on a relation is checked against the related model
    expect(query({ Character: { campaign: { where: { level: 1 } } } }).skip).toBe(false);
    // @ts-expect-error a relation name typo is not a key the schema knows
    expect(() => query({ Character: { campain: true } })).not.toBeNull();
    // @ts-expect-error nor is one nested a level down
    expect(() => query({ CampaignMember: { userProfile: { charcters: true } } })).not.toBeNull();
    const nestedLimit = () =>
      // @ts-expect-error limit is root-only
      query({ Campaign: { characters: { orderBy: { name: "asc" }, limit: 1 } } });
    expect(nestedLimit).not.toBeNull();
    // @ts-expect-error unknown model
    expect(() => query({ Nope: {} })).not.toBeNull();
    const typed = query({ Character: { where: { class: "FOX", level: { ge: 2 } } } });
    expect(typed.filter).toEqual({ class: { eq: "FOX" }, level: { ge: 2 } });
  });
});

/**
 * Live data layer over Amplify Data.
 *
 *   const playersQuery = defineQuery((campaignId: string | undefined) =>
 *     query({
 *       CampaignMember: {
 *         where: { campaignId },
 *         campaign: true,
 *         userProfile: { characters: { where: { campaignId } } },
 *       },
 *     }),
 *   );
 *   const members = useObserveQuery(playersQuery, campaignId); // undefined while loading
 *   type Member = QueryResult<ReturnType<typeof playersQuery>>;
 *
 * A query is a tree. Every node is the same shape: `where` (Amplify's filter
 * input, or a bare scalar meaning `eq`), `select`, `orderBy`, and one entry
 * per relationship to follow, keyed by its name in amplify/data/resource.ts
 * (`true` to take it as is, or a nested node). The root node is keyed by its
 * model name and may also carry `limit`. Everything is typed off the schema,
 * and the result type is derived from the same tree. Foreign keys, direction
 * and cardinality of relationships come from the model introspection that
 * Amplify.configure() loads. `joins` holds hand-written JoinSpecs for what
 * the schema doesn't declare. An `undefined` in a `where` shorthand skips the
 * query: nothing is subscribed and the hook stays undefined.
 *
 * How rows stay live
 * - Every observed row lives in one normalized cache per model. Snapshots only
 *   replace rows whose fields changed, so an edit seen by any query reaches
 *   every query showing that row, and untouched rows keep their identity.
 * - Queries that differ only in the value of one eq field (ids for a
 *   belongsTo, the foreign key for a hasMany, a route's campaignId) share a
 *   single AppSync subscription carrying the union of their values and are
 *   narrowed client-side. Past AppSync's 10-clause limit the subscription
 *   drops the value clause and narrows everything client-side. Replacements
 *   take over only after their first snapshot (make-before-break), and an
 *   abandoned subscription lingers 1s for remounts.
 * - Amplify's observeQuery lists once, then merges onCreate/onUpdate/onDelete
 *   events in memory; a single edit never re-lists. Its filtered onUpdate
 *   can't see an edit that moves a row into or out of the filter, so one
 *   unfiltered onUpdate per model admits rows that enter a query's scope and
 *   every emission re-checks the filter client-side to drop rows that left.
 * - `limit` + `orderBy` ("the ten most recently updated") is served from a
 *   secondary index when the schema declares one for (where field, orderBy
 *   field): one index query, then item events decide whether the window could
 *   have changed before refetching it. Without an index it falls back to the
 *   full live set sorted and sliced client-side, with a console warning.
 */
import type { ModelRelationshipField } from "@aws-amplify/data-schema";
import type { ModelPath } from "@aws-amplify/data-schema/runtime";
import { Amplify } from "aws-amplify";
import { getCurrentUser, type GetCurrentUserOutput } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import _ from "lodash";
import { useEffect, useState } from "react";
import { createStore } from "zustand/vanilla";

import type { Schema } from "../amplify/data/resource";

type Client = ReturnType<typeof generateClient<Schema>>;

let memoizedClient: Client | undefined;

// Deferred so the client is created after Amplify.configure() runs, and
// shared so every caller talks to the same instance.
export const getClient = (): Client => (memoizedClient ??= generateClient<Schema>());

type ModelName = keyof Schema & keyof Client["models"];
type FlatModel<M extends ModelName> = Schema[M]["__meta"]["flatModel"];
type RawFields<M extends ModelName> = Schema[M]["__meta"]["rawType"]["fields"];
type ModelFilter<M extends ModelName> = Client["models"][M] extends {
  list: (options?: { filter?: infer F }) => unknown;
}
  ? F
  : never;

type Item<V> = V extends ReadonlyArray<infer E> ? E : V;

// Keys of a flat model that hold data rather than a related model (or list of
// them): what Amplify's default selection set returns.
type ScalarKeys<M> = {
  [K in keyof M]-?: NonNullable<Item<M[K]>> extends Record<string, unknown> ? never : K;
}[keyof M] &
  string;

type Head<P> = P extends `${infer H}.${string}` ? H : never;
type Tail<P, K extends string> = P extends `${K}.${infer T}` ? T : never;
type Expand<M, Paths extends string> = Paths extends "*" ? ScalarKeys<M> : Paths;

// The row a selection of `Paths` yields: scalar paths pick the field (optional
// ones as `T | null`, as GraphQL returns them), dotted paths descend into the
// related model, and "relation.*" expands to that model's scalars. A direct
// mapped type rather than Amplify's SelectionSet, whose deep-pick/restore/
// prettify passes over the flat model blow TypeScript's instantiation limit as
// soon as selections appear inside a join tree (TS2589).
type Selected<M, Paths extends string> = {
  [K in keyof M as K extends Paths | Head<Paths> ? K : never]-?: K extends Paths
    ? M[K]
    : Descend<NonNullable<M[K]>, Tail<Paths, K & string>>;
};
type Descend<V, Paths extends string> =
  V extends ReadonlyArray<infer E>
    ? Selected<NonNullable<E>, Expand<NonNullable<E>, Paths>>[]
    : Selected<V, Expand<V, Paths>> | null;

type Selections<T extends ModelName> = ReadonlyArray<ModelPath<FlatModel<T>>>;

// Distributes so `Tuple | undefined` (an optional select) yields the tuple's
// paths, and a bare undefined yields never, i.e. the default selection set.
type SelectedPaths<U> = U extends ReadonlyArray<string> ? U[number] : never;

type QueryRow<T extends ModelName, U> = Selected<
  FlatModel<T>,
  [SelectedPaths<U>] extends [never] ? ScalarKeys<FlatModel<T>> : SelectedPaths<U>
>;

// Relationships as declared in amplify/data/resource.ts, read off the raw
// schema type: the related model's name and whether the field is a list.
type RelationKeys<T extends ModelName> = {
  [K in keyof RawFields<T>]: RawFields<T>[K] extends ModelRelationshipField<any, any, any, any>
    ? K
    : never;
}[keyof RawFields<T>] &
  string;
type Relationship<T extends ModelName, K extends string> =
  RawFields<T>[K & keyof RawFields<T>] extends ModelRelationshipField<
    infer Shape,
    infer Related extends ModelName,
    any,
    any
  >
    ? { model: Related; many: Shape["array"] }
    : never;

// Amplify's filter input plus a shorthand: a bare scalar means `{ eq }`, and an
// `undefined` value marks the whole query as skipped (no subscription, result
// stays undefined) rather than silently matching everything.
export type Where<T extends ModelName> = {
  [K in keyof ModelFilter<T>]?:
    | ModelFilter<T>[K]
    | (K extends keyof FlatModel<T> ? Extract<FlatModel<T>[K], string | number | boolean> : never);
};

// Sort order applied in key order; "last ten updated" is
// { orderBy: { updatedAt: "desc" }, limit: 10 } on the root node
export type OrderBy<T extends ModelName> = Partial<
  Record<ScalarKeys<FlatModel<T>>, "asc" | "desc">
>;

// Rows seen on the way to a join: ctx.root holds the root query's rows, then
// one entry per ancestor join, keyed by its join name ("root" is reserved).
type JoinContext = { root: ReadonlyArray<any> } & Record<string, ReadonlyArray<any>>;

// A hand-written join, for anything the schema's relationships can't express.
export type JoinSpec<Row = any> = {
  // literal `true` (not boolean) so QueryResult can tell array joins apart
  many?: true;
  // id(s) on the parent row that select this join's children
  from: (
    row: Row,
    ctx: JoinContext,
  ) => string | ReadonlyArray<string | null | undefined> | null | undefined;
  // child-side key, defaults to the child's id; the field it reads must be in
  // the child query's selections (not compiler-checked)
  match?: (child: any) => string | null | undefined;
  // built from the deduped ids of every parent row; never called with []
  query: (ids: string[], ctx: JoinContext) => AnyQuery;
};

// One node of a query tree. Relationship entries sit beside the options: the
// key field a relationship reads must be in the parent's select (the default
// select always has it). Lambdas in `joins` see the node's default row.
export type Node<M extends ModelName> = {
  where?: Where<M>;
  select?: Selections<M>;
  orderBy?: OrderBy<M>;
  joins?: Record<string, JoinSpec<QueryRow<M, undefined>>>;
} & { [K in RelationKeys<M>]?: true | Node<Relationship<M, K>["model"]> };

// Windowed query: only the first `limit` rows in orderBy order. Served by a
// secondary index (partition key = the where field, sort key = the orderBy
// field) when the schema declares one, refetched only when an item event could
// change the window; without an index it degrades to the full live set sorted
// and sliced client-side. Root only: a window per parent row isn't expressible
// in one subscription.
export type QueryTree = { [M in ModelName]?: Node<M> & { limit?: number } };

// A generic constraint alone lets unknown keys through (no excess-property
// check on inferred type params), so the argument is also checked against
// this mirror of itself where every key the schema doesn't know is `never`.
type ValidateNode<N, M extends ModelName, Allowed extends string> = {
  [K in keyof N]: K extends Allowed
    ? N[K]
    : K extends RelationKeys<M>
      ? N[K] extends true
        ? true
        : ValidateNode<N[K], Relationship<M, K>["model"], NestedKeys>
      : never;
};
type NestedKeys = "where" | "select" | "orderBy" | "joins";
type Validate<O> = {
  [M in keyof O]: M extends ModelName ? ValidateNode<O[M], M, NestedKeys | "limit"> : never;
};

// Structural shape every Query shares at runtime; `tree` is a phantom that
// carries the description the result type is derived from
type AnyQuery = {
  model: ModelName;
  select?: ReadonlyArray<string>;
  filter?: unknown;
  orderBy?: Partial<Record<string, "asc" | "desc">>;
  limit?: number;
  join?: Record<string, JoinEntry>;
  skip: boolean;
};
type RawNode = Record<string, unknown>;
type JoinEntry = true | RawNode | JoinSpec;
const isJoinSpec = (entry: JoinEntry): entry is JoinSpec =>
  typeof entry === "object" && typeof entry.from === "function";
export type Query<O extends QueryTree = QueryTree> = AnyQuery & { readonly tree?: O };

// Expands the where shorthand; an undefined value skips the query
const normalizeWhere = (where: unknown) => {
  const entries = Object.entries((where ?? {}) as RawNode);
  return {
    skip: entries.some(([, value]) => value === undefined),
    filter:
      entries.length === 0
        ? undefined
        : Object.fromEntries(
            entries.map(([key, value]) => [
              key,
              value !== null && typeof value === "object" ? value : { eq: value },
            ]),
          ),
  };
};

const nodeToQuery = (
  model: ModelName,
  { where, select, orderBy, limit, joins, ...relations }: RawNode,
): AnyQuery => {
  if (limit !== undefined && Object.keys((orderBy ?? {}) as RawNode).length === 0)
    throw new Error(`query on ${model}: limit needs an orderBy to define which rows come first`);
  return {
    model,
    select: select as AnyQuery["select"],
    orderBy: orderBy as AnyQuery["orderBy"],
    limit: limit as number | undefined,
    join: { ...relations, ...(joins as RawNode | undefined) } as AnyQuery["join"],
    ...normalizeWhere(where),
  };
};

// Builds a query from a tree with exactly one root model. Omitted select means
// every scalar field (Amplify's default selection set).
export const query = <const O extends QueryTree>(tree: O & Validate<O>): Query<O> => {
  const roots = Object.entries(tree);
  if (roots.length !== 1) throw new Error("query() takes a tree with exactly one root model");
  const [model, node] = roots[0]!;
  return nodeToQuery(model as ModelName, node as RawNode);
};

type QueryArgs = ReadonlyArray<string | number | boolean | null | undefined>;

// Wraps a query factory so the same args always return the same Query object:
// that identity keys useObserveQuery's subscription lifetime, which is why
// defineQuery must be called at module level, never inline in render. The
// cache grows per distinct arg tuple, which stays tiny in practice.
export const defineQuery = <Args extends QueryArgs, Q extends AnyQuery>(
  build: (...args: Args) => Q,
): ((...args: Args) => Q) => _.memoize(build, (...args: unknown[]) => JSON.stringify(args));

type Many<IsMany, R> = IsMany extends true ? R[] : R | null;

type NodeResult<M extends ModelName, N> = QueryRow<
  M,
  N extends { select: infer S } ? S : undefined
> & {
  [K in keyof N & RelationKeys<M>]: Many<
    Relationship<M, K>["many"],
    NodeResult<Relationship<M, K>["model"], N[K]>
  >;
} & (N extends { joins: infer J }
    ? {
        [K in keyof J]: J[K] extends JoinSpec
          ? Many<J[K] extends { many: true } ? true : false, QueryResult<ReturnType<J[K]["query"]>>>
          : never;
      }
    : unknown);

export type QueryResult<Q extends AnyQuery> =
  Q extends Query<infer O>
    ? { [M in keyof O & ModelName]: NodeResult<M, O[M]> }[keyof O & ModelName]
    : never;

type Row = Record<string, unknown> & { id: string };
type Subscription = { unsubscribe: () => void };

// Normalized cache of every row any subscription has seen, keyed model → id.
// Emissions always read row data from here, so the freshest version wins no
// matter which subscription delivered it. No eviction: membership comes from
// live snapshots, so deleted rows simply stop being referenced.
const rowCache = createStore<{ rows: { [M in ModelName]?: Record<string, Row> } }>(() => ({
  rows: {},
}));

// A row older than the cached version, by updatedAt: Amplify's observeQuery
// keeps re-sending the version it listed, even after an unfiltered update
// delivered a newer one
const isStale = (previous: Row, row: Row) =>
  typeof previous.updatedAt === "string" &&
  typeof row.updatedAt === "string" &&
  row.updatedAt < previous.updatedAt;

// Shallow-merge upsert that keeps object identity for unchanged rows (and the
// whole state when nothing changed), so listeners can cheaply detect no-ops.
// Field values are compared structurally: nested selections ("characters.*")
// arrive as fresh arrays every snapshot.
const upsertRows = (model: ModelName, incoming: Row[]) =>
  rowCache.setState((state) => {
    const bucket = state.rows[model] ?? {};
    const changed = incoming.filter((row) => {
      const previous = bucket[row.id];
      return (
        !previous ||
        (!isStale(previous, row) &&
          Object.entries(row).some(([key, value]) => !_.isEqual(previous[key], value)))
      );
    });
    return changed.length === 0
      ? state
      : {
          rows: {
            ...state.rows,
            [model]: {
              ...bucket,
              ...Object.fromEntries(changed.map((row) => [row.id, { ...bucket[row.id], ...row }])),
            },
          },
        };
  });

const compare = (value: unknown, expected: unknown): number | undefined =>
  (typeof value === "number" && typeof expected === "number") ||
  (typeof value === "string" && typeof expected === "string")
    ? value < expected
      ? -1
      : value > expected
        ? 1
        : 0
    : undefined;

const matchesPredicate = (value: unknown, operator: string, expected: unknown): boolean => {
  const order = compare(value, expected);
  switch (operator) {
    case "eq":
      return _.isEqual(value, expected);
    case "ne":
      return !_.isEqual(value, expected);
    case "lt":
      return order !== undefined && order < 0;
    case "le":
      return order !== undefined && order <= 0;
    case "gt":
      return order !== undefined && order > 0;
    case "ge":
      return order !== undefined && order >= 0;
    case "contains":
      return typeof value === "string"
        ? value.includes(String(expected))
        : Array.isArray(value) && value.includes(expected);
    case "notContains":
      return !matchesPredicate(value, "contains", expected);
    case "beginsWith":
      return typeof value === "string" && value.startsWith(String(expected));
    case "between": {
      const [low, high] = expected as [unknown, unknown];
      return matchesPredicate(value, "ge", low) && matchesPredicate(value, "le", high);
    }
    case "attributeExists":
      return (value != null) === expected;
    default:
      return true; // an operator this can't evaluate never drops a row
  }
};

// Client-side evaluation of an AppSync filter, used to re-check rows the
// server stopped telling us about. A field the row doesn't carry can't be
// judged and keeps the row.
const matchesFilter = (row: Row, filter: unknown): boolean =>
  filter == null ||
  Object.entries(filter as RawNode).every(([key, condition]) =>
    key === "and"
      ? (condition as unknown[]).every((clause) => matchesFilter(row, clause))
      : key === "or"
        ? (condition as unknown[]).some((clause) => matchesFilter(row, clause))
        : key === "not"
          ? !matchesFilter(row, condition)
          : !(key in row) ||
            Object.entries((condition ?? {}) as RawNode).every(([operator, expected]) =>
              matchesPredicate(row[key], operator, expected),
            ),
  );

// The value of a `{ eq: string }` predicate, or undefined for any other shape
const eqOf = (predicate: unknown): string | undefined => {
  const { eq, ...others } = (predicate ?? {}) as { eq?: unknown };
  return Object.keys(others).length === 0 && typeof eq === "string" ? eq : undefined;
};

// The single-field eq clause a `{ field: { eq } }` object carries, if that is
// all it carries
const clauseOf = (clause: unknown): [field: string, value: string] | undefined => {
  const entries = Object.entries((clause ?? {}) as RawNode);
  const value = entries.length === 1 ? eqOf(entries[0]![1]) : undefined;
  return value === undefined ? undefined : [entries[0]![0], value];
};

type ParsedFilter = { field?: string; values?: string[]; rest?: unknown };

// Splits a filter into the values it wants for one field and everything else
// (`rest`), so queries differing only in those values share one subscription.
// Recognized: an `or` of eq clauses on one field (what relationship joins
// build), else a top-level eq clause, `id` first. Anything else passes
// through verbatim as rest.
const parseFilter = (filter: unknown): ParsedFilter => {
  if (filter == null) return {};
  const { or, ...others } = filter as RawNode;
  const rest = (object: RawNode) => (Object.keys(object).length > 0 ? object : undefined);
  if (Array.isArray(or)) {
    const clauses = or.map(clauseOf);
    const field = clauses[0]?.[0];
    return field && clauses.every((clause) => clause?.[0] === field)
      ? {
          field,
          values: [...new Set(clauses.map((clause) => clause![1]))].sort(),
          rest: rest(others),
        }
      : { rest: filter };
  }
  const eqFields = Object.keys(others).filter((key) => eqOf(others[key]) !== undefined);
  const field = eqFields.includes("id") ? "id" : eqFields[0];
  if (field === undefined) return { rest: filter };
  const { [field]: clause, ...remaining } = others;
  return { field, values: [eqOf(clause)!], rest: rest(remaining) };
};

// Channel identity: everything about a query except which values it wants.
const channelKeyOf = (
  model: ModelName,
  select: ReadonlyArray<string> | undefined,
  field: string | undefined,
  rest: unknown,
): string =>
  JSON.stringify({ model, select: select ?? null, field: field ?? null, rest: rest ?? null });

type Stream<Payload> = (options?: { selectionSet?: string[]; filter?: unknown }) => {
  subscribe: (handlers: {
    next: (payload: Payload) => void;
    error: (error: unknown) => void;
  }) => Subscription;
};

// client.models can't be indexed by a generic key; the casts stay here
const streamsOf = (model: ModelName) =>
  getClient().models[model] as unknown as {
    observeQuery: Stream<{ items: unknown[] }>;
    onCreate: Stream<unknown>;
    onUpdate: Stream<unknown>;
    onDelete: Stream<unknown>;
  };
const indexQueryOf = (model: ModelName, queryField: string) =>
  (
    getClient().models[model] as unknown as Record<
      string,
      (input: RawNode, options: RawNode) => Promise<{ data: unknown[] }>
    >
  )[queryField]!;

type Watch = { handle: Subscription; listeners: Set<(item: Row) => void> };
const watches = new Map<ModelName, Watch>();

// One unfiltered onUpdate per model, shared by everything observing it and
// released with the last listener: the only way to hear about an edit that
// moves a row into or out of a filtered subscription's scope. Every update
// also refreshes the cache.
const watchUpdates = (model: ModelName, listener: (item: Row) => void): (() => void) => {
  const watch =
    watches.get(model) ??
    (() => {
      const created: Watch = {
        listeners: new Set(),
        handle: streamsOf(model)
          .onUpdate()
          .subscribe({
            next: (item) => {
              upsertRows(model, [item as Row]);
              created.listeners.forEach((listen) => listen(item as Row));
            },
            error: (error) => console.error(`onUpdate ${model} failed`, error),
          }),
      };
      watches.set(model, created);
      return created;
    })();
  watch.listeners.add(listener);
  return () => {
    watch.listeners.delete(listener);
    if (watch.listeners.size > 0) return;
    watches.delete(model);
    watch.handle.unsubscribe();
  };
};

type Physical = {
  // values of the key field this physical subscribed with; undefined = no
  // narrowing
  values?: string[];
  // assigned once observeQuery returns; a synchronous first snapshot can
  // arrive before that
  handle?: Subscription;
  // row ids of the latest snapshot; undefined until the first one lands
  snapshotIds?: string[];
  // rows an update moved into this physical's filter after it listed:
  // Amplify's observeQuery ignores updates for rows it doesn't hold
  entered: Set<string>;
  disposed?: boolean;
};

type ConsumerEntry = {
  // sorted values the consumer wants; undefined = every row matching rest
  values?: string[];
  onRows: (rows: Row[]) => void;
  lastEmitted?: Row[];
};

// One channel per (model, select, field, rest): all consumers that differ
// only in the key field's values share it, backed by a single live AppSync
// subscription. `active` serves emissions; `pending` is a make-before-break
// replacement that only takes over once its first snapshot lands.
type Channel = {
  model: ModelName;
  select?: ReadonlyArray<string>;
  field?: string;
  rest?: unknown;
  consumers: Set<ConsumerEntry>;
  active?: Physical;
  pending?: Physical;
  release: () => void;
  teardownTimer?: ReturnType<typeof setTimeout>;
};

const channels = new Map<string, Channel>();

const disposePhysical = (physical?: Physical) => {
  if (!physical) return;
  physical.disposed = true;
  physical.handle?.unsubscribe();
};

const covers = (physical: Physical | undefined, values?: string[]): boolean =>
  !!physical &&
  (!physical.values || (!!values && values.every((value) => physical.values!.includes(value))));

// The key-field clause the channel's physical subscription should carry: the
// union of every consumer's values, or none at all when a consumer wants all
// rows or the union has more than the 10 or-clauses AppSync allows before it
// silently kills the subscription (consumers then narrow to their own values
// client-side at emission). rest never holds an or-clause of its own:
// parseFilter only splits out an `or` that is entirely same-field eq clauses.
const desiredValues = (channel: Channel): string[] | undefined => {
  const wanted = [...channel.consumers].map((consumer) => consumer.values);
  if (wanted.some((values) => !values)) return undefined;
  const union = [...new Set(wanted.flat() as string[])].sort();
  return union.length > 10 ? undefined : union;
};

const composeFilter = (rest: unknown, field: string | undefined, values?: string[]): unknown => {
  if (!values || !field) return rest;
  const clause =
    values.length === 1
      ? { [field]: { eq: values[0] } }
      : { or: values.map((value) => ({ [field]: { eq: value } })) };
  return rest == null ? clause : { and: [rest, clause] };
};

// An explicit select always carries the cache key and the version field
const selectionSetOf = (select: ReadonlyArray<string> | undefined) =>
  select && { selectionSet: [...new Set([...select, "id", "updatedAt"])] };

const subscribeRaw = (
  model: ModelName,
  select: ReadonlyArray<string> | undefined,
  filter: unknown,
  next: (rows: Row[]) => void,
): Subscription =>
  streamsOf(model)
    .observeQuery({
      ...selectionSetOf(select),
      ...(filter != null ? { filter } : {}),
    })
    .subscribe({
      next: ({ items }) => next([...items] as Row[]),
      error: (error) => console.error(`observeQuery ${model} failed`, error),
    });

// Membership comes from the covering snapshot plus rows that entered since;
// row data comes from the cache so the freshest version wins, and each row is
// re-checked against the consumer's filter so one that left scope drops out.
// No cache-only results: nothing is emitted until a covering snapshot
// confirms which rows exist.
const emitToConsumer = (channel: Channel, consumer: ConsumerEntry) => {
  const { active } = channel;
  if (!active?.snapshotIds || !covers(active, consumer.values)) return;
  const filter = composeFilter(channel.rest, channel.field, consumer.values);
  const bucket = rowCache.getState().rows[channel.model] ?? {};
  const rows = [...new Set([...active.snapshotIds, ...active.entered])]
    .flatMap((id) => bucket[id] ?? [])
    .filter((row) => matchesFilter(row, filter));
  if (
    consumer.lastEmitted &&
    rows.length === consumer.lastEmitted.length &&
    rows.every((row, index) => row === consumer.lastEmitted![index])
  )
    return;
  consumer.lastEmitted = rows;
  consumer.onRows(rows);
};

const emitAll = (channel: Channel) =>
  channel.consumers.forEach((consumer) => emitToConsumer(channel, consumer));

// An updated row the active physical doesn't list but whose new values match
// its filter is admitted; one that left is dropped at emission by the filter
// re-check, since the cache already holds its new values.
const admit = (channel: Channel, item: Row) => {
  const { active } = channel;
  if (
    !active?.snapshotIds ||
    active.snapshotIds.includes(item.id) ||
    active.entered.has(item.id) ||
    !matchesFilter(item, composeFilter(channel.rest, channel.field, active.values))
  )
    return;
  active.entered.add(item.id);
  emitAll(channel);
};

// Promote a pending physical whose first snapshot just landed, emit, and
// re-evaluate: the desired value set may have moved while it was in flight.
const settle = (channel: Channel, physical: Physical) => {
  if (channel.pending === physical) {
    disposePhysical(channel.active);
    channel.active = physical;
    channel.pending = undefined;
  }
  if (channel.active === physical) emitAll(channel);
  reconcile(channel);
};

const reconcile = (channel: Channel) => {
  if (channel.consumers.size === 0) return;
  const desired = desiredValues(channel);
  // Churn guard: while the active physical covers the desired set (never
  // narrow while covered) or an in-flight one does (superset-wait: let it
  // deliver its first snapshot before reconsidering), leave things alone.
  if (covers(channel.active, desired) || covers(channel.pending, desired)) return;
  disposePhysical(channel.pending);
  const physical: Physical = { values: desired, entered: new Set() };
  physical.handle = subscribeRaw(
    channel.model,
    channel.select,
    composeFilter(channel.rest, channel.field, desired),
    (rows) => {
      if (physical.disposed) return;
      physical.snapshotIds = rows.map((row) => row.id);
      upsertRows(channel.model, rows);
      // a synchronous first emission arrives before this physical is
      // registered below; the post-registration settle catches it
      if (channel.active === physical || channel.pending === physical) settle(channel, physical);
    },
  );
  if (channel.active) channel.pending = physical;
  else channel.active = physical;
  if (physical.snapshotIds) settle(channel, physical);
};

const channelFor = (
  model: ModelName,
  select: ReadonlyArray<string> | undefined,
  { field, rest }: ParsedFilter,
) => {
  const key = channelKeyOf(model, select, field, rest);
  const existing = channels.get(key);
  if (existing) return existing;
  const channel: Channel = { model, select, field, rest, consumers: new Set(), release: _.noop };
  // any cache write to this model may carry fresher data for rows this
  // channel is serving — re-emit so every consumer sees it
  const cacheUnsubscribe = rowCache.subscribe((state, previous) => {
    if (state.rows[model] !== previous.rows[model]) emitAll(channel);
  });
  const unwatch = watchUpdates(model, (item) => admit(channel, item));
  channel.release = () => {
    channels.delete(key);
    cacheUnsubscribe();
    unwatch();
    disposePhysical(channel.active);
    disposePhysical(channel.pending);
  };
  channels.set(key, channel);
  return channel;
};

type ConsumerHandle = { update: (values?: string[]) => void; unsubscribe: () => void };

const subscribeConsumer = (query: AnyQuery, onRows: (rows: Row[]) => void): ConsumerHandle => {
  const parsed = parseFilter(query.filter);
  const channel = channelFor(query.model, query.select, parsed);
  clearTimeout(channel.teardownTimer);
  channel.teardownTimer = undefined;
  const consumer: ConsumerEntry = { values: parsed.values, onRows };
  channel.consumers.add(consumer);
  reconcile(channel);
  emitToConsumer(channel, consumer);
  return {
    update: (values) => {
      consumer.values = values;
      reconcile(channel);
      emitToConsumer(channel, consumer);
    },
    unsubscribe: () => {
      channel.consumers.delete(consumer);
      if (channel.consumers.size > 0) return;
      // 1s linger bridges make-before-break cascades, route bounces, and
      // StrictMode double-effects without holding dead subscriptions long
      channel.teardownTimer = setTimeout(channel.release, 1000);
    },
  };
};

// Appends the key-field clause a relationship join selects its children by.
// Always the or-form, even for one value, so parseFilter keys the channel on
// the join's field rather than on whatever `where` happened to filter on.
const keyedBy = (filter: unknown, field: string, ids: string[]): unknown => {
  const clause = { or: ids.map((id) => ({ [field]: { eq: id } })) };
  const existing = (filter ?? {}) as RawNode;
  return filter == null
    ? clause
    : "or" in existing || field in existing
      ? { and: [filter, clause] }
      : { ...existing, ...clause };
};

// Turns a relationship entry (`true` or a nested node) into a JoinSpec using
// the model introspection Amplify.configure() loaded from amplify_outputs.
const relationshipJoin = (model: ModelName, key: string, entry: true | RawNode): JoinSpec => {
  const field = Amplify.getConfig().API?.GraphQL?.modelIntrospection?.models[model]?.fields[key];
  const related =
    field?.type && typeof field.type === "object" && "model" in field.type
      ? (field.type.model as ModelName)
      : undefined;
  if (!field?.association || !related)
    throw new Error(`${model}.${key} is not a relationship on the schema; use joins for it`);
  const children = (keyField: string, ids: string[]): AnyQuery => {
    const child = nodeToQuery(related, entry === true ? {} : entry);
    return { ...child, filter: keyedBy(child.filter, keyField, ids) };
  };
  const { association } = field;
  if ("associatedWith" in association) {
    // hasMany / hasOne: the child row carries the parent's id
    const [foreignKey] = association.associatedWith;
    return {
      ...(field.isArray && { many: true }),
      from: (row: Row) => row.id,
      match: (child: Row) => child[foreignKey!] as string | null | undefined,
      query: (ids) => children(foreignKey!, ids),
    };
  }
  // belongsTo: the parent row carries the child's id
  const [foreignKey] = association.targetNames;
  return {
    from: (row: Row) => row[foreignKey!] as string | null | undefined,
    query: (ids) => children("id", ids),
  };
};

const applyOrder = (rows: Row[], { orderBy, limit }: AnyQuery): Row[] => {
  const keys = Object.entries(orderBy ?? {}).filter(
    (entry): entry is [string, "asc" | "desc"] => entry[1] !== undefined,
  );
  const sorted =
    keys.length === 0
      ? rows
      : _.orderBy(
          rows,
          keys.map(([key]) => key),
          keys.map(([, direction]) => direction),
        );
  return limit === undefined ? sorted : sorted.slice(0, limit);
};

type WindowPlan = {
  queryField: string;
  partitionKey: string;
  partitionValue: string;
  sortKey: string;
  direction: "ASC" | "DESC";
  limit: number;
  // the rest of the filter, passed along to the index query
  filter?: unknown;
};

// How a limited query can be served server-side: a secondary index whose
// partition key is the one eq field the filter keys on and whose sort key is
// the single orderBy field. undefined when the schema has no such index.
const windowPlanFor = ({ model, filter, orderBy, limit }: AnyQuery): WindowPlan | undefined => {
  const { field, values, rest } = parseFilter(filter);
  const [sort, ...more] = Object.entries(orderBy ?? {});
  if (limit === undefined || !field || values?.length !== 1 || !sort || more.length > 0)
    return undefined;
  const index = Amplify.getConfig().API?.GraphQL?.modelIntrospection?.models[
    model
  ]?.attributes?.find(
    ({ type, properties }) =>
      type === "key" &&
      typeof properties?.queryField === "string" &&
      _.isEqual(properties.fields?.slice(0, 2), [field, sort[0]]),
  );
  return (
    index && {
      queryField: index.properties!.queryField as string,
      partitionKey: field,
      partitionValue: values[0]!,
      sortKey: sort[0],
      direction: sort[1] === "desc" ? "DESC" : "ASC",
      limit,
      filter: rest,
    }
  );
};

// Emits only when the row list actually changed (same length, same identities)
const dedupe = (onRows: (rows: Row[]) => void) => {
  let last: Row[] | undefined;
  return (rows: Row[]) => {
    if (last && rows.length === last.length && rows.every((row, index) => row === last![index]))
      return;
    last = rows;
    onRows(rows);
  };
};

// Windowed query served by a secondary index: one index query for the first
// `limit` rows, then item events decide whether the window could have
// changed: filtered onCreate/onDelete, and the model's unfiltered onUpdate so
// a row edited out of the filter is seen leaving. An event is applicable when
// its item is in the window, or the window isn't full, or the item would sort
// at or before the window's last row. An in-window update that keeps its sort
// value and scope patches the cache in place; everything else applicable
// refetches the window, coalescing events that land mid-flight into one
// follow-up fetch. Unshared and never updated in place: a window is specific
// to its partition value, order and limit, so the join tree resubscribes when
// those change.
const subscribeWindow = (
  query: AnyQuery,
  plan: WindowPlan,
  onRows: (rows: Row[]) => void,
): ConsumerHandle => {
  const { model, select, filter } = query;
  const emit = dedupe(onRows);
  const fetchWindow = indexQueryOf(model, plan.queryField);
  let window: Row[] | undefined;
  let disposed = false;
  let refetching = false;
  let dirty = false;

  const emitWindow = () => {
    const bucket = rowCache.getState().rows[model] ?? {};
    if (window) emit(window.map((row) => bucket[row.id] ?? row));
  };

  const refetch = async () => {
    if (refetching) {
      dirty = true;
      return;
    }
    refetching = true;
    try {
      do {
        dirty = false;
        const { data } = await fetchWindow(
          { [plan.partitionKey]: plan.partitionValue },
          {
            limit: plan.limit,
            sortDirection: plan.direction,
            ...selectionSetOf(select),
            ...(plan.filter != null && { filter: plan.filter }),
          },
        );
        if (disposed) return;
        window = [...data] as Row[];
        upsertRows(model, window);
        emitWindow();
      } while (dirty);
    } catch (error) {
      // the next applicable event retries; the last good window stays shown
      console.error(`${plan.queryField} ${model} failed`, error);
    } finally {
      refetching = false;
    }
  };

  const ranksAtOrBefore = (item: Row, last: Row) =>
    applyOrder([item, last], { ...query, limit: undefined })[0] === item;

  const onEvent = (operation: "create" | "update" | "delete", item: Row) => {
    if (!window) {
      dirty = true; // lands before the first window: the fetch loop picks it up
      return;
    }
    const current = window.find((row) => row.id === item.id);
    const inScope = operation !== "delete" && matchesFilter(item, filter);
    if (!inScope) {
      if (current) refetch();
    } else if (current && _.isEqual(current[plan.sortKey], item[plan.sortKey])) {
      upsertRows(model, [item]); // the cache listener below re-emits
    } else if (current || window.length < plan.limit || ranksAtOrBefore(item, window.at(-1)!)) {
      refetch();
    }
  };

  const streams = streamsOf(model);
  const options = filter != null ? { filter } : {};
  const subscriptions = [
    streams.onCreate(options).subscribe({
      next: (item) => onEvent("create", item as Row),
      error: (error) => console.error(`onCreate ${model} failed`, error),
    }),
    streams.onDelete(options).subscribe({
      next: (item) => onEvent("delete", item as Row),
      error: (error) => console.error(`onDelete ${model} failed`, error),
    }),
    { unsubscribe: watchUpdates(model, (item) => onEvent("update", item)) },
    {
      unsubscribe: rowCache.subscribe((state, previous) => {
        if (state.rows[model] !== previous.rows[model]) emitWindow();
      }),
    },
  ];
  refetch();

  return {
    update: _.noop,
    unsubscribe: () => {
      disposed = true;
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    },
  };
};

const warnedNoIndex = new Set<string>();

// Picks how a query's own rows are kept live: the shared full-set channel
// (orderBy applied client-side), or a server-side window when `limit` is set
// and the schema has an index to serve it.
const subscribeRows = (query: AnyQuery, onRows: (rows: Row[]) => void): ConsumerHandle => {
  const plan = windowPlanFor(query);
  if (plan) return subscribeWindow(query, plan, onRows);
  const key = `${query.model}:${JSON.stringify(query.orderBy ?? null)}`;
  if (query.limit !== undefined && !warnedNoIndex.has(key)) {
    warnedNoIndex.add(key);
    console.warn(
      `query on ${query.model} has a limit but no secondary index serves (where, orderBy); falling back to the full live set sorted client-side`,
    );
  }
  return subscribeConsumer(query, (rows) => onRows(applyOrder(rows, query)));
};

// from() may return a single id, a sparse list, or nothing at all
const normalizeIds = (ids: unknown): string[] =>
  (Array.isArray(ids) ? ids : [ids]).filter((id): id is string => typeof id === "string");

// Identity of the subscription a child query lands on: its channel, or for a
// windowed query (never updated in place) the whole query including values
const childKeyOf = (query: AnyQuery): string => {
  const { field, values, rest } = parseFilter(query.filter);
  const channelKey = channelKeyOf(query.model, query.select, field, rest);
  return query.limit === undefined
    ? channelKey
    : JSON.stringify([channelKey, values, query.orderBy, query.limit]);
};

type TreeHandle = {
  // same-channel refresh: new values for the root consumer plus a fresh parent
  // context for join derivation, with no resubscription
  update: (query: AnyQuery, ctx: JoinContext) => void;
  unsubscribe: () => void;
};

type JoinNode = {
  key: string;
  spec: JoinSpec;
  // subscription key of the current child query; "" while there is none
  childKey?: string;
  // undefined until the child delivers once, gating emission; stale rows are
  // kept across child resubscriptions (make-before-break) so consumers never
  // see data vanish while a replacement warms up
  rows?: Row[];
  handle?: TreeHandle;
};

// One consumer (behind the shared channels above) per node of the join tree.
// Each snapshot rebuilds the child queries from the new rows; a child whose
// subscription key is unchanged gets its values updated in place, and one
// that genuinely moved is resubscribed new-before-old so shared channels
// never momentarily empty. Assembled rows are emitted only once every node
// has delivered, so consumers never see a partially-joined result.
const observeQueryTree = (
  query: AnyQuery,
  next: (rows: Row[]) => void,
  initialCtx: JoinContext = { root: [] },
  selfName = "root",
): TreeHandle => {
  const joinNodes: JoinNode[] = Object.entries(query.join ?? {}).map(([key, entry]) => ({
    key,
    spec: isJoinSpec(entry) ? entry : relationshipJoin(query.model, key, entry),
  }));
  let disposed = false;
  let ctx = initialCtx;
  let baseRows: Row[] | undefined;
  let childCtx: JoinContext = ctx;

  const emitIfReady = () => {
    if (disposed || !baseRows || joinNodes.some((node) => !node.rows)) return;
    const attachments = joinNodes.map((node) => ({
      node,
      byKey: _.groupBy(node.rows, (child) => (node.spec.match ?? ((row: Row) => row.id))(child)),
    }));
    next(
      baseRows.map((row) => ({
        ...row,
        ...Object.fromEntries(
          attachments.map(({ node, byKey }) => {
            const children = normalizeIds(node.spec.from(row, childCtx)).flatMap(
              (id) => byKey[id] ?? [],
            );
            return [node.key, node.spec.many ? children : (children[0] ?? null)];
          }),
        ),
      })),
    );
  };

  const deriveChildren = () => {
    joinNodes.forEach((node) => {
      const ids = [
        ...new Set((baseRows ?? []).flatMap((row) => normalizeIds(node.spec.from(row, childCtx)))),
      ].sort();
      const built = ids.length > 0 ? node.spec.query(ids, childCtx) : undefined;
      const childQuery = built?.skip ? undefined : built;
      const childKey = childQuery ? childKeyOf(childQuery) : "";
      if (childKey === node.childKey) {
        if (childQuery) node.handle?.update(childQuery, childCtx);
        return;
      }
      node.childKey = childKey;
      const previous = node.handle;
      node.handle =
        childQuery &&
        observeQueryTree(
          childQuery,
          (childRows) => {
            node.rows = childRows;
            emitIfReady();
          },
          childCtx,
          node.key,
        );
      previous?.unsubscribe();
      if (!childQuery) node.rows = [];
    });
  };

  const rootHandle = subscribeRows(query, (rows) => {
    if (disposed) return;
    baseRows = rows;
    childCtx = { ...ctx, [selfName]: rows };
    deriveChildren();
    emitIfReady();
  });

  return {
    update: (nextQuery, nextCtx) => {
      if (disposed) return;
      ctx = nextCtx;
      rootHandle.update(parseFilter(nextQuery.filter).values);
      if (!baseRows) return;
      childCtx = { ...ctx, [selfName]: baseRows };
      deriveChildren();
      emitIfReady();
    },
    unsubscribe: () => {
      disposed = true;
      rootHandle.unsubscribe();
      joinNodes.forEach((node) => node.handle?.unsubscribe());
    },
  };
};

// Live-updating list of a model's records, including the relationships the
// tree follows. Relationship paths like "characters.*" in an explicit select
// are returned as inline arrays but do NOT live-update; follow the
// relationship when the nested data needs to stay fresh. A skipped query
// subscribes to nothing and stays undefined. `def` must come from a
// module-level defineQuery call — an inline factory changes identity every
// render and would resubscribe each time.
export const useObserveQuery = <Args extends QueryArgs, Q extends AnyQuery>(
  def: (...args: Args) => Q,
  ...args: Args
): QueryResult<Q>[] | undefined => {
  const query = def(...args);
  // rows are tagged with the query they answer so a change of args reads as
  // loading on the very next render, never as the previous args' rows
  const [result, setResult] = useState<{ query: AnyQuery; rows: QueryResult<Q>[] }>();

  useEffect(() => {
    if (query.skip) return;
    const subscription = observeQueryTree(query, (rows) =>
      setResult({ query, rows: rows as QueryResult<Q>[] }),
    );
    return () => subscription.unsubscribe();
  }, [query]);

  return result?.query === query ? result.rows : undefined;
};

export const useCurrentUser = () => {
  const [user, setUser] = useState<GetCurrentUserOutput>();

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return user;
};

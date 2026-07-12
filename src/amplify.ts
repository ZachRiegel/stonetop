import type { ModelPath } from "@aws-amplify/data-schema/runtime";
import { getCurrentUser, type GetCurrentUserOutput } from "aws-amplify/auth";
import { generateClient, type SelectionSet } from "aws-amplify/data";
import { useEffect, useMemo, useState } from "react";

import type { Schema } from "../amplify/data/resource";

type Client = ReturnType<typeof generateClient<Schema>>;

let memoizedClient: Client | undefined;

// Deferred so the client is created after Amplify.configure() runs, and
// shared so every caller talks to the same instance.
export const getClient = (): Client => (memoizedClient ??= generateClient<Schema>());

export const useClient = (): Client => useMemo(() => getClient(), []);

export type CurrentUser = GetCurrentUserOutput;

type ModelName = keyof Schema & keyof Client["models"];
type FlatModel<M extends ModelName> = Schema[M]["__meta"]["flatModel"];
type ModelFilter<M extends ModelName> = Client["models"][M] extends {
  list: (options?: { filter?: infer F }) => unknown;
}
  ? F
  : never;

type QueryRow<T extends ModelName, U extends ReadonlyArray<ModelPath<FlatModel<T>>>> = SelectionSet<
  Schema[T],
  U,
  FlatModel<T>
>;

// any is the only valid wildcard for Query's constrained params, and join
// lambdas can't be tied to sibling properties without order-dependent
// contextual typing
type AnyQuery = Query<any, any, any>;

// Rows seen on the way to a join: ctx.root holds the root query's rows, then
// one entry per ancestor join, keyed by its join name ("root" is reserved).
type JoinContext = { root: ReadonlyArray<any> } & Record<string, ReadonlyArray<any>>;

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

export type Joins<Row = any> = Record<string, JoinSpec<Row>>;

// A join attaches every child row whose match() key is among the parent row's
// from() ids, as an array (many: true) or single-or-null property. Overloaded
// (instead of a defaulted J) so the joins literal's lambdas are contextually
// typed from the constraint rather than J collapsing to its default.
export function defineQuery<T extends ModelName, U extends ReadonlyArray<ModelPath<FlatModel<T>>>>(
  model: T,
  selections: U,
  filter?: ModelFilter<T>,
): Query<T, U>;
export function defineQuery<
  T extends ModelName,
  U extends ReadonlyArray<ModelPath<FlatModel<T>>>,
  J extends Joins<QueryRow<T, U>>,
>(model: T, selections: U, filter: ModelFilter<T> | undefined, joins: J): Query<T, U, J>;
export function defineQuery<
  T extends ModelName,
  U extends ReadonlyArray<ModelPath<FlatModel<T>>>,
  J extends Joins<QueryRow<T, U>>,
>(model: T, selections: U, filter?: ModelFilter<T>, joins?: J): Query<T, U, J> {
  return { model, selections, filter, joins };
}

export type Query<
  T extends ModelName,
  U extends ReadonlyArray<ModelPath<FlatModel<T>>>,
  J extends Joins = Record<string, never>,
> = {
  model: T;
  selections: U;
  filter?: ModelFilter<T>;
  joins?: J;
};

type JoinResults<J extends Joins> = string extends keyof J
  ? unknown // no joins declared: intersects away to the base row type
  : {
      [K in keyof J]: ReturnType<J[K]["query"]> extends infer Q extends AnyQuery
        ? J[K] extends { many: true }
          ? QueryResult<Q>[]
          : QueryResult<Q> | null
        : never;
    };

export type QueryResult<Q extends AnyQuery> =
  Q extends Query<infer T extends ModelName, infer U, infer J extends Joins>
    ? SelectionSet<Schema[T], U, FlatModel<T>> & JoinResults<J>
    : never;

type Row = Record<string, unknown>;
type Subscription = { unsubscribe: () => void };

// client.models can't be indexed by a generic key, and observeQuery rejects
// readonly tuples at runtime; both casts stay contained here
const observeModel = (
  client: Client,
  query: AnyQuery,
  next: (rows: Row[]) => void,
): Subscription => {
  const { observeQuery } = client.models[query.model as ModelName] as {
    observeQuery: (options: { selectionSet: string[]; filter?: unknown }) => {
      subscribe: (handlers: {
        next: (snapshot: { items: unknown[] }) => void;
        error: (error: unknown) => void;
      }) => Subscription;
    };
  };
  return observeQuery({
    selectionSet: [...query.selections],
    filter: query.filter,
  }).subscribe({
    next: ({ items }) => next([...items] as Row[]),
    error: (error) => console.error(`observeQuery ${query.model} failed`, error),
  });
};

// from() may return a single id, a sparse list, or nothing at all
const normalizeIds = (ids: unknown): string[] =>
  (Array.isArray(ids) ? ids : [ids]).filter((id): id is string => typeof id === "string");

type JoinNode = {
  key: string;
  spec: JoinSpec;
  // stringified child query; undefined until the first snapshot processes
  queryKey?: string;
  // undefined while the current child subscription hasn't fired, gating emission
  rows?: Row[];
  handle?: Subscription;
};

// One live observeQuery per node of the join tree. Each snapshot rebuilds the
// child queries from the new rows; a child resubscribes only when the query it
// derives from its parents actually changes. Assembled rows are emitted only
// once every node has delivered a snapshot, so consumers never see a
// partially-joined result.
const observeQueryTree = (
  client: Client,
  query: AnyQuery,
  next: (rows: Row[]) => void,
  ctx: JoinContext = { root: [] },
  selfName = "root",
): Subscription => {
  const joinNodes: JoinNode[] = Object.entries((query.joins ?? {}) as Joins).map(([key, spec]) => ({
    key,
    spec,
  }));
  let disposed = false;
  let baseRows: Row[] | undefined;
  let childCtx: JoinContext = ctx;

  const emitIfReady = () => {
    if (disposed || !baseRows || joinNodes.some((node) => !node.rows)) return;
    const attachments = joinNodes.map((node) => ({
      node,
      byKey: (node.rows ?? []).reduce((children, child) => {
        const key = (node.spec.match ?? ((row: Row) => row.id as string))(child);
        return key == null ? children : children.set(key, [...(children.get(key) ?? []), child]);
      }, new Map<string, Row[]>()),
    }));
    next(
      baseRows.map((row) => ({
        ...row,
        ...Object.fromEntries(
          attachments.map(({ node, byKey }) => {
            const children = normalizeIds(node.spec.from(row, childCtx)).flatMap(
              (id) => byKey.get(id) ?? [],
            );
            return [node.key, node.spec.many ? children : (children[0] ?? null)];
          }),
        ),
      })),
    );
  };

  console.log("Running query for: ", client, query);

  const rootSubscription = observeModel(client, query, (rows) => {
    if (disposed) return;
    baseRows = rows;
    childCtx = { ...ctx, [selfName]: rows };
    joinNodes.forEach((node) => {
      const ids = [
        ...new Set(rows.flatMap((row) => normalizeIds(node.spec.from(row, childCtx)))),
      ].sort();
      const childQuery = ids.length > 0 ? node.spec.query(ids, childCtx) : undefined;
      const queryKey = childQuery
        ? JSON.stringify({
            model: childQuery.model,
            selections: childQuery.selections,
            filter: childQuery.filter,
          })
        : "";
      if (queryKey === node.queryKey) return;
      node.queryKey = queryKey;
      node.handle?.unsubscribe();
      node.rows = childQuery ? undefined : [];
      node.handle =
        childQuery &&
        observeQueryTree(
          client,
          childQuery,
          (childRows) => {
            node.rows = childRows;
            emitIfReady();
          },
          childCtx,
          node.key,
        );
    });
    emitIfReady();
  });

  return {
    unsubscribe: () => {
      disposed = true;
      rootSubscription.unsubscribe();
      joinNodes.forEach((node) => node.handle?.unsubscribe());
    },
  };
};

// Live-updating list of a model's records, including any join-tree children
// declared on the query. Relationship paths like "characters.*" in the
// selections are returned as inline arrays but do NOT live-update; declare a
// join when the nested data needs to stay fresh.
export const useObserveQuery = <Q extends AnyQuery>(query: Q): QueryResult<Q>[] | undefined => {
  const client = useClient();
  const [items, setItems] = useState<QueryResult<Q>[] | undefined>();

  useEffect(() => {
    const subscription = observeQueryTree(client, query, (rows) =>
      setItems(rows as QueryResult<Q>[]),
    );
    return () => subscription.unsubscribe();
  }, [client, query]);

  return items;
};

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser>();

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return user;
};

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

export const defineQuery = <T extends ModelName, U extends ReadonlyArray<ModelPath<FlatModel<T>>>>(
  model: T,
  selections: U,
  filter?: ModelFilter<T>,
): Query<T, U> => ({
  model,
  selections,
  filter,
});

export type Query<T extends ModelName, U extends ReadonlyArray<ModelPath<FlatModel<T>>>> = {
  model: T;
  selections: U;
  filter?: ModelFilter<T>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is the only valid wildcard for these constrained type params
export type QueryResult<Q extends Query<any, any>> =
  Q extends Query<infer T, infer U> ? SelectionSet<Schema[T], U, FlatModel<T>> : never;

// Live-updating list of a model's records. Relationship paths like
// "characters.*" are returned as inline arrays instead of lazy loaders.
export const useObserveQuery = <
  T extends ModelName,
  U extends ReadonlyArray<ModelPath<FlatModel<T>>>,
>(
  query: Query<T, U>,
): QueryResult<Query<T, U>>[] | undefined => {
  const client = useClient();
  const [items, setItems] = useState<QueryResult<Query<T, U>>[] | undefined>();

  useEffect(() => {
    // client.models can't be indexed by a generic key, and observeQuery
    // rejects readonly tuples at runtime; both casts stay contained here
    const { observeQuery } = client.models[query.model] as {
      observeQuery: (options: { selectionSet: string[]; filter?: ModelFilter<T> }) => {
        subscribe: (handlers: { next: (snapshot: { items: unknown[] }) => void }) => {
          unsubscribe: () => void;
        };
      };
    };
    const subscription = observeQuery({
      selectionSet: [...query.selections],
      filter: query.filter,
    }).subscribe({
      next: ({ items }) => setItems([...items] as QueryResult<Query<T, U>>[]),
    });
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

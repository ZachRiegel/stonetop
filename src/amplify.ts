import { useEffect, useState } from "react";
import { generateClient, type SelectionSet } from "aws-amplify/data";
import { getCurrentUser, type GetCurrentUserOutput } from "aws-amplify/auth";
import type { ModelPath } from "@aws-amplify/data-schema/runtime";

import type { Schema } from "../amplify/data/resource";

export const client = generateClient<Schema>();

export type CurrentUser = GetCurrentUserOutput;

type ModelName = keyof Schema & keyof typeof client.models;
type FlatModel<M extends ModelName> = Schema[M]["__meta"]["flatModel"];

export const defineQuery = <T extends ModelName, U extends ReadonlyArray<ModelPath<FlatModel<T>>>>(
  model: T,
  selections: U,
): Query<T, U> => ({
  model,
  selections,
});

export type Query<T extends ModelName, U extends ReadonlyArray<ModelPath<FlatModel<T>>>> = {
  model: T;
  selections: U;
};

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
  const [items, setItems] = useState<QueryResult<Query<T, U>>[] | undefined>();

  useEffect(() => {
    // client.models can't be indexed by a generic key, and observeQuery
    // rejects readonly tuples at runtime; both casts stay contained here
    console.log("use effect?");
    const { observeQuery } = client.models[query.model] as {
      observeQuery: (options: { selectionSet: string[] }) => {
        subscribe: (handlers: { next: (snapshot: { items: unknown[] }) => void }) => {
          unsubscribe: () => void;
        };
      };
    };
    const subscription = observeQuery({ selectionSet: [...query.selections] }).subscribe({
      next: ({ items }) => setItems([...items] as any),
    });
    return () => subscription.unsubscribe();
  }, [query]);

  return items;
};

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser>();

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return user;
};

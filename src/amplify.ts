import { useEffect, useState } from "react";
import { generateClient, type SelectionSet } from "aws-amplify/data";
import { getCurrentUser, type GetCurrentUserOutput } from "aws-amplify/auth";
import type { ModelPath } from "@aws-amplify/data-schema/runtime";

import type { Schema } from "../amplify/data/resource";

export const client = generateClient<Schema>();

export type CurrentUser = GetCurrentUserOutput;

type ModelName = keyof Schema & keyof typeof client.models;
type FlatModel<M extends ModelName> = Schema[M]["__meta"]["flatModel"];

// The result type of selecting the paths S from model M. Note: SelectionSet's
// default third type parameter silently resolves to `any` for a generic M, so
// FlatModel<M> must be passed explicitly.
export type Selected<
  M extends ModelName,
  S extends ReadonlyArray<ModelPath<FlatModel<M>>>,
> = SelectionSet<Schema[M], S, FlatModel<M>>;

// Live-updating list of a model's records. Relationship paths like
// "characters.*" are returned as inline arrays instead of lazy loaders.
export const useObserveQuery = <
  M extends ModelName,
  const S extends ReadonlyArray<ModelPath<FlatModel<M>>>,
>(
  model: M,
  selectionSet: S,
): Selected<M, S>[] => {
  const [items, setItems] = useState<Selected<M, S>[]>([]);

  useEffect(() => {
    // client.models can't be indexed by a generic key, and observeQuery
    // rejects readonly tuples at runtime; both casts stay contained here
    const { observeQuery } = client.models[model] as {
      observeQuery: (options: { selectionSet: string[] }) => {
        subscribe: (handlers: { next: (snapshot: { items: unknown[] }) => void }) => {
          unsubscribe: () => void;
        };
      };
    };
    const subscription = observeQuery({ selectionSet: [...selectionSet] }).subscribe({
      next: ({ items }) => setItems([...items] as Selected<M, S>[]),
    });
    return () => subscription.unsubscribe();
  }, [model, JSON.stringify(selectionSet)]);

  return items;
};

export const useCurrentUser = () => {
  const [user, setUser] = useState<CurrentUser>();

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return user;
};

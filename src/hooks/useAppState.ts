import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppStateKey,
  GetStateKeyValuesQuery,
  useGetStateKeyValuesQuery,
  useSetStateKeyValuesMutation,
} from "../generated/graphql";

export function useAppState<T>(
  appStateKey: AppStateKey,
  initialValue: T
): [T, (appState: T) => void, () => Promise<void>];
export function useAppState<T>(
  appStateKey: AppStateKey
): [T | undefined, (appState: T) => void, () => Promise<void>];
export function useAppState<T>(
  appStateKey: AppStateKey,
  initialValue?: T
): [T | undefined, (appState: T) => void, () => Promise<void>] {
  const initialValueRef = useRef(initialValue);
  const [state, setState] = useState<T>();
  const setStateFromData = useCallback(
    (data: GetStateKeyValuesQuery | undefined) => {
      if (data?.appState && data.appState.length > 0 && data.appState[0]) {
        setState(JSON.parse(data.appState[0]));
      }
    },
    []
  );

  useEffect(() => {
    if (initialValueRef.current != null) {
      setState(initialValueRef.current);
    }
  }, []);

  const { data, refetch } = useGetStateKeyValuesQuery({
    variables: { stateKeys: [appStateKey] },
  });

  useEffect(() => {
    setStateFromData(data);
  }, [data, setStateFromData]);

  const [setStateKeyValuesMutation] = useSetStateKeyValuesMutation();

  const setAppState = useCallback(
    (state: T) => {
      setState(state);
      setStateKeyValuesMutation({
        variables: {
          stateKeys: [appStateKey],
          stateVals: [JSON.stringify(state)],
        },
      });
    },
    [appStateKey, setStateKeyValuesMutation]
  );

  const refetchState = useCallback(async () => {
    const { data } = await refetch({ stateKeys: [appStateKey] });
    setStateFromData(data);
  }, [appStateKey, refetch, setStateFromData]);

  return [state, setAppState, refetchState];
}

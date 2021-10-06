import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AppStateKey,
  useGetStateKeyValuesQuery,
  useSetStateKeyValuesMutation,
} from "../generated/graphql";

export function useAppState<T>(appStateKey: AppStateKey) {
  const [state, setState] = useState<T | undefined>();

  const { data } = useGetStateKeyValuesQuery({
    variables: { stateKeys: [appStateKey] },
  });

  useEffect(() => {
    if (data?.appState && data.appState.length > 0 && data.appState[0]) {
      setState(JSON.parse(data.appState[0]));
    }
  }, [data]);

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

  return [state, setAppState];
}

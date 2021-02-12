import type { FetchFunction } from "relay-runtime";
import { Environment, Network, RecordSource, Store } from "relay-runtime";
import { requestAsync } from "..";

export const fetchRelayQuery: FetchFunction = async (operation, variables) => {
  const res = await requestAsync("graphQL", "query", { query: operation.text, variables });
  console.log("Got GraphQL response: ", res);
  return res;
};

export interface GraphQlQuery {
  response: unknown,
  variables: {[key: string]: any},
}

export const fetchQuery = async <Q extends GraphQlQuery>(query: string, variables: Q['variables']): Promise<Q['response']> => {
  const res = await requestAsync("graphQL", "query", { query, variables });
  return res;
}

const environment = new Environment({
  network: Network.create(fetchRelayQuery),
  store: new Store(new RecordSource()),
});

export default environment;

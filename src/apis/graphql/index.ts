import type { FetchFunction } from "relay-runtime";
import { Environment, Network, RecordSource, Store } from "relay-runtime";
import { requestAsync } from "..";

const fetchQuery: FetchFunction = async (operation, variables) => {
  const res = await requestAsync("graphQL", "query", { query: operation.text, variables });
  console.log("Got GraphQL response: ", res);
  return res;
};

const environment = new Environment({
  network: Network.create(fetchQuery),
  store: new Store(new RecordSource()),
});

export default environment;

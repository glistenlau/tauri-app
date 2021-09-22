import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
  Observable,
  split
} from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { print } from "graphql";
import { requestAsync } from "..";
import { Response } from '../';

enum Action {
  ServerPort = "serverPort",
}

interface ResponseBody {
  serverPort: number;
}

interface Payload {}

class Graphql {
  sendRequest = async (action: Action, payload: Payload): Promise<ResponseBody> => {
    const rsp = (await requestAsync("graphQL", action, payload)) as Response<ResponseBody>;
    if (rsp.success) {
      return rsp.result;
    } else {
      throw new Error(`error on graphql command: ${rsp.result.message}`);
    }
  };

  getServerPort = async () => {
    const rsp = await this.sendRequest(Action.ServerPort, {});
    return rsp.serverPort;
  };
}

export default new Graphql();

const rustLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    fetchGraphql(print(operation.query), operation.variables)
      .then((res) => {
        console.log("fetch result: ", res);
        observer.next(res);
        observer.complete();
      })
      .catch((err) => {
        observer.error(err);
      });
  });
});

const fetchGraphql = async (query: string, variables: Record<string, any>) => {
  return requestAsync("graphQL", "query", { query, variables });
};

export const getClient = (serverPort: number) => {
  const httpLink = new HttpLink({
    uri: `http://127.0.0.1:${serverPort}/graphql/`,
  });

  const wsLink = new WebSocketLink({
    uri: `ws://127.0.0.1:${serverPort}/`,
    options: {
      reconnect: true,
    },
  });

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === "OperationDefinition" &&
        definition.operation === "subscription"
      );
    },
    wsLink,
    httpLink
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  });
};

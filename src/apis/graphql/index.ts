import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  split,
} from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { requestAsync } from "..";
import { Response } from "../";

enum Action {
  ServerPort = "serverPort",
}

interface ResponseBody {
  serverPort: number;
}

interface Payload {}

class Graphql {
  sendRequest = async (
    action: Action,
    payload: Payload
  ): Promise<ResponseBody> => {
    const rsp = (await requestAsync(
      "graphQL",
      action,
      payload
    )) as Response<ResponseBody>;
    if (rsp.success) {
      return rsp.result;
    } else {
      throw new Error(`error on graphql command: ${rsp.result.message}`);
    }
  };

  getServerPort = async () => {
    return 8888;
  };
}

export default new Graphql();

let instance: ApolloClient<NormalizedCacheObject>;

export const getClient = (serverPort: number) => {
  if (!instance) {
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

    instance = new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache(),
    });
  }

  return instance;
};

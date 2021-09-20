import { ApolloClient, ApolloLink, InMemoryCache, Observable } from "@apollo/client";
import { print } from "graphql";
import { requestAsync } from "..";

enum Action {
  ServerPort = "serverPort",
}

interface Response {
  serverPort: number;
}; 

interface Payload {
}

class Graphql {
  sendRequest = async (
      action: Action,
      payload: Payload,
  ): Promise<Response> => {
      const rsp = (await requestAsync("graphQL", action, payload)) as Response;
      return rsp;
  };

  getServerPort = async () => {
      const rsp = await this.sendRequest(Action.ServerPort, {});
      return rsp.serverPort;
  }
}

export default new Graphql();

const rustLink = new ApolloLink((operation, forward) => {
  return new Observable((observer) => {
    fetchGraphql(print(operation.query), operation.variables).then(res => {
      console.log('fetch result: ', res);
      observer.next(res);
      observer.complete();
    })
    .catch(err => {
      observer.error(err);
    });
  });
});

const fetchGraphql = async(query: string, variables: Record<string, any> ) => {
  return requestAsync("graphQL", "query", {query, variables});
}

// const client = new ApolloClient({
//   cache: new InMemoryCache(),
//   link: rustLink,
// });

export const getClient = (serverPort: number) => new ApolloClient({
  uri: `http://127.0.0.1:${serverPort}/graphql`,
  cache: new InMemoryCache()
});

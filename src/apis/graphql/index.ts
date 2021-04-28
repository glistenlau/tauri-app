import { ApolloClient, ApolloLink, InMemoryCache, Observable } from "@apollo/client";
import { print } from "graphql";
import { requestAsync } from "..";

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

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link: rustLink,
});

export default client;

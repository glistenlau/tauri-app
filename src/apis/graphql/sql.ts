import graphql, { getClient } from ".";
import {
  Config,
  Dbtype,
  ExecuteStmtDocument,
  ExecuteStmtQuery,
  ExecuteStmtQueryVariables,
  SetAutocommitDocument,
  SetAutocommitMutation,
  SetAutocommitMutationVariables,
  SetConfigDocument,
  SetConfigMutation,
  SetConfigMutationVariables,
} from "../../generated/graphql";

const getApolloClient = async () => {
  const port = await graphql.getServerPort();
  return getClient(port);
};

export const setAutocommit = async (dbType: Dbtype, dbAutocommit: boolean) => {
  const client = await getApolloClient();

  const res = await client.mutate<
    SetAutocommitMutation,
    SetAutocommitMutationVariables
  >({ variables: { dbType, dbAutocommit }, mutation: SetAutocommitDocument });

  return res.data;
};

export const setConfig = async (dbType: Dbtype, dbConfig: Config) => {
  const client = await getApolloClient();

  const res = await client.mutate<
    SetConfigMutation,
    SetConfigMutationVariables
  >({
    variables: { dbType: dbType, dbConfig: dbConfig },
    mutation: SetConfigDocument,
  });

  return res.data;
};

export const executeStmt = async (
  dbType: Dbtype,
  params: any,
  schema: string,
  stmt: string,
  withStat: boolean
) => {
  const client = await getApolloClient();

  const res = await client.query<ExecuteStmtQuery, ExecuteStmtQueryVariables>({
    variables: { dbType, params, schema, stmt, withStat },
    query: ExecuteStmtDocument,
  });

  return res.data;
};

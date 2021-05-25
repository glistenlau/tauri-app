import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions =  {}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export enum DbFamily {
  Oracle = 'ORACLE',
  Postgres = 'POSTGRES',
  Both = 'BOTH'
}

export type ExplainRow = {
  __typename?: 'ExplainRow';
  id: Scalars['Int'];
  operation: Scalars['String'];
  level: Scalars['Int'];
  name?: Maybe<Scalars['String']>;
  starts: Scalars['Int'];
  eRows?: Maybe<Scalars['Int']>;
  aRows?: Maybe<Scalars['Int']>;
  aTime?: Maybe<Scalars['String']>;
  buffers: Scalars['String'];
  hasChildren: Scalars['Boolean'];
  oMem?: Maybe<Scalars['String']>;
  oneMem?: Maybe<Scalars['String']>;
  usedMem?: Maybe<Scalars['String']>;
  predicateInformation?: Maybe<Scalars['String']>;
  children?: Maybe<Array<ExplainRow>>;
};

export type Mutation = {
  __typename?: 'Mutation';
  changeSchemaValues: SchemaFile;
};


export type MutationChangeSchemaValuesArgs = {
  filePath: Scalars['String'];
  values: Array<Scalars['String']>;
};

export type NodeValue = {
  __typename?: 'NodeValue';
  start: Scalars['Int'];
  end: Scalars['Int'];
  dbFamily?: Maybe<DbFamily>;
};

export type Query = {
  __typename?: 'Query';
  apiVersion: Scalars['String'];
  dbSchemas: Array<SchemaFile>;
  dbExplain: Array<ExplainRow>;
};


export type QueryDbSchemasArgs = {
  searchFolder: Scalars['String'];
  searchPattern: Scalars['String'];
};


export type QueryDbExplainArgs = {
  text: Scalars['String'];
  targetId?: Maybe<Scalars['Int']>;
};

export type SchemaFile = {
  __typename?: 'SchemaFile';
  path: Scalars['String'];
  root: TreeNode;
};

export type TreeNode = {
  __typename?: 'TreeNode';
  tagName: Scalars['String'];
  nameAttr?: Maybe<Scalars['String']>;
  values: Array<NodeValue>;
  children: Array<TreeNode>;
  dbFamily?: Maybe<DbFamily>;
};

export type DbExplainQueryQueryVariables = Exact<{
  explainText: Scalars['String'];
  targetId?: Maybe<Scalars['Int']>;
}>;


export type DbExplainQueryQuery = (
  { __typename?: 'Query' }
  & { dbExplain: Array<(
    { __typename?: 'ExplainRow' }
    & { children?: Maybe<Array<(
      { __typename?: 'ExplainRow' }
      & DbExplainRowFieldsFragment
    )>> }
    & DbExplainRowFieldsFragment
  )> }
);

export type DbExplainRowFieldsFragment = (
  { __typename?: 'ExplainRow' }
  & Pick<ExplainRow, 'id' | 'operation' | 'level' | 'hasChildren' | 'name' | 'starts' | 'eRows' | 'aRows' | 'aTime' | 'buffers' | 'oMem' | 'oneMem' | 'usedMem' | 'predicateInformation'>
);

export type DbSchemaSearchQueryVariables = Exact<{
  searchFolder: Scalars['String'];
  searchPattern: Scalars['String'];
}>;


export type DbSchemaSearchQuery = (
  { __typename?: 'Query' }
  & { dbSchemas: Array<(
    { __typename?: 'SchemaFile' }
    & Pick<SchemaFile, 'path'>
    & { root: (
      { __typename?: 'TreeNode' }
      & DbSchemaTreeNodeFieldsFragment
      & DbSchemaTreeNodeRecursiveFragment
    ) }
  )> }
);

export type DbSchemaTreeNodeRecursiveFragment = (
  { __typename?: 'TreeNode' }
  & { children: Array<(
    { __typename?: 'TreeNode' }
    & { children: Array<(
      { __typename?: 'TreeNode' }
      & DbSchemaTreeNodeFieldsFragment
    )> }
    & DbSchemaTreeNodeFieldsFragment
  )> }
);

export type DbSchemaTreeNodeFieldsFragment = (
  { __typename?: 'TreeNode' }
  & Pick<TreeNode, 'tagName' | 'nameAttr' | 'dbFamily'>
  & { values: Array<(
    { __typename?: 'NodeValue' }
    & Pick<NodeValue, 'start' | 'end' | 'dbFamily'>
  )> }
);

export const DbExplainRowFieldsFragmentDoc = gql`
    fragment dbExplainRowFields on ExplainRow {
  id
  operation
  level
  hasChildren
  name
  starts
  eRows
  aRows
  aTime
  buffers
  oMem
  oneMem
  usedMem
  predicateInformation
}
    `;
export const DbSchemaTreeNodeFieldsFragmentDoc = gql`
    fragment dbSchemaTreeNodeFields on TreeNode {
  values {
    start
    end
    dbFamily
  }
  tagName
  nameAttr
  dbFamily
}
    `;
export const DbSchemaTreeNodeRecursiveFragmentDoc = gql`
    fragment dbSchemaTreeNodeRecursive on TreeNode {
  children {
    ...dbSchemaTreeNodeFields
    children {
      ...dbSchemaTreeNodeFields
    }
  }
}
    ${DbSchemaTreeNodeFieldsFragmentDoc}`;
export const DbExplainQueryDocument = gql`
    query dbExplainQuery($explainText: String!, $targetId: Int) {
  dbExplain(text: $explainText, targetId: $targetId) {
    ...dbExplainRowFields
    children {
      ...dbExplainRowFields
    }
  }
}
    ${DbExplainRowFieldsFragmentDoc}`;

/**
 * __useDbExplainQueryQuery__
 *
 * To run a query within a React component, call `useDbExplainQueryQuery` and pass it any options that fit your needs.
 * When your component renders, `useDbExplainQueryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDbExplainQueryQuery({
 *   variables: {
 *      explainText: // value for 'explainText'
 *      targetId: // value for 'targetId'
 *   },
 * });
 */
export function useDbExplainQueryQuery(baseOptions: Apollo.QueryHookOptions<DbExplainQueryQuery, DbExplainQueryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DbExplainQueryQuery, DbExplainQueryQueryVariables>(DbExplainQueryDocument, options);
      }
export function useDbExplainQueryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DbExplainQueryQuery, DbExplainQueryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DbExplainQueryQuery, DbExplainQueryQueryVariables>(DbExplainQueryDocument, options);
        }
export type DbExplainQueryQueryHookResult = ReturnType<typeof useDbExplainQueryQuery>;
export type DbExplainQueryLazyQueryHookResult = ReturnType<typeof useDbExplainQueryLazyQuery>;
export type DbExplainQueryQueryResult = Apollo.QueryResult<DbExplainQueryQuery, DbExplainQueryQueryVariables>;
export const DbSchemaSearchDocument = gql`
    query dbSchemaSearch($searchFolder: String!, $searchPattern: String!) {
  dbSchemas(searchFolder: $searchFolder, searchPattern: $searchPattern) {
    path
    root {
      ...dbSchemaTreeNodeFields
      ...dbSchemaTreeNodeRecursive
    }
  }
}
    ${DbSchemaTreeNodeFieldsFragmentDoc}
${DbSchemaTreeNodeRecursiveFragmentDoc}`;

/**
 * __useDbSchemaSearchQuery__
 *
 * To run a query within a React component, call `useDbSchemaSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useDbSchemaSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDbSchemaSearchQuery({
 *   variables: {
 *      searchFolder: // value for 'searchFolder'
 *      searchPattern: // value for 'searchPattern'
 *   },
 * });
 */
export function useDbSchemaSearchQuery(baseOptions: Apollo.QueryHookOptions<DbSchemaSearchQuery, DbSchemaSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DbSchemaSearchQuery, DbSchemaSearchQueryVariables>(DbSchemaSearchDocument, options);
      }
export function useDbSchemaSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DbSchemaSearchQuery, DbSchemaSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DbSchemaSearchQuery, DbSchemaSearchQueryVariables>(DbSchemaSearchDocument, options);
        }
export type DbSchemaSearchQueryHookResult = ReturnType<typeof useDbSchemaSearchQuery>;
export type DbSchemaSearchLazyQueryHookResult = ReturnType<typeof useDbSchemaSearchLazyQuery>;
export type DbSchemaSearchQueryResult = Apollo.QueryResult<DbSchemaSearchQuery, DbSchemaSearchQueryVariables>;
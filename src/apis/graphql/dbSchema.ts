import { graphql } from "babel-plugin-relay/macro";

export const searchSchemaQuery = graphql`
  query dbSchemaSearchQuery($searchFolder: String!, $searchPattern: String!) {
    dbSchemas(searchFolder: $searchFolder, searchPattern: $searchPattern) {
      path
      root {
        ...dbSchemaTreeNodeFields
        ...dbSchemaTreeNodeRecursive
      }
    }
  }
`;

graphql`
  fragment dbSchemaTreeNodeRecursive on TreeNode {
    children {
      ...dbSchemaTreeNodeFields
      children {
          ...dbSchemaTreeNodeFields
      }
    }
  }
`;

graphql`
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

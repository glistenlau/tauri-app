import GraphiQL from "graphiql";
import {
  Fetcher,
  FetcherOpts,
  FetcherParams
} from "graphiql/dist/components/GraphiQL";
import "graphiql/graphiql.min.css";
import React, { useCallback } from "react";
import styled from "styled-components";
import { requestAsync } from "../../apis";
import TabContent from "../../components/TabContent";

const Container = styled(TabContent)`
  background-color: ${({ theme }) => theme.palette.background.paper};
  display: block;
`;

interface GraphqlViewProps {
  active: boolean;
  className?: string;
}


const GraphqlView: React.FC<GraphqlViewProps> = ({ active }) => {
  const fetchQuery: Fetcher = useCallback(
    async (graphQLParams: FetcherParams, opts?: FetcherOpts) => {
      const res = await requestAsync("graphQL", "query", {
        query: graphQLParams.query,
        variables: graphQLParams.variables || {},
      });
      return res;
    },
    []
  );
  return (
    <Container active={active}>
      <GraphiQL fetcher={fetchQuery} />
    </Container>
  );
};

export default GraphqlView;

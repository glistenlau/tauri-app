import { Typography } from "@material-ui/core";
import React from "react";
import styled from "styled-components";
import SVGIcon from "./SVGIcon";

export interface LabelWithDdIconProps {
  className?: string;
  showOracleIcon?: boolean;
  showPostgresIcon?: boolean;
}

const Container = styled.span`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
`;

const TextContainer = styled(Typography)`
  flex: 1;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const LeftSVGIcon = styled(SVGIcon)`
  flex-shrink: 0;
  margin-right: 3px;
`;

const LabelWithDbIcons: React.FC<LabelWithDdIconProps> = React.memo(
  ({ className, showOracleIcon, showPostgresIcon, children }) => {
    return (
      <Container className={className}>
        {showOracleIcon === true && (
          <LeftSVGIcon name="database" width={20} height={20} />
        )}
        {showPostgresIcon === true && (
          <LeftSVGIcon name="postgres" width={20} height={20} />
        )}

        <TextContainer>{children}</TextContainer>
      </Container>
    );
  }
);

export default LabelWithDbIcons;

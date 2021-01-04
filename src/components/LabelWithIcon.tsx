import { Typography } from "@material-ui/core";
import React from "react";
import styled from "styled-components";

export interface LabelWithIconProps {
  Icon?: React.FC;
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

const IconContainer = styled.span`
  flex-shrink: 0;
  margin-right: 3px;
  align-items: center;
  justify-content: center;
  height: 20px;
  width: 20px;
`;

const LabelWithIcon: React.FC<LabelWithIconProps> = React.memo(
  ({ className, Icon, children }) => {
    return (
      <Container className={className}>
        {Icon && (
          <IconContainer>
            <Icon />
          </IconContainer>
        )}
        <TextContainer>{children}</TextContainer>
      </Container>
    );
  }
);

export default LabelWithIcon;

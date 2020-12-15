import React, { useMemo } from "react";
import styled from "styled-components";

const ActiveContent = styled.div`
  height: 50%;
  width: 100%;
  overflow: hidden;
  flex: 1;
`;

const HiddenContent = styled.div`
  height: 0px;
  width: 0px;
  overflow: hidden;
`;

interface TabContentProps {
  active: boolean;
  className?: string;
  children: any;
}

const TabContent: React.FC<TabContentProps> = ({
  active,
  children,
  className,
}) => {
  const ContainerRenderer = useMemo(
    () => (active ? ActiveContent : HiddenContent),
    [active]
  );

  return (
    <ContainerRenderer className={className}>{children}</ContainerRenderer>
  );
};

export default TabContent;

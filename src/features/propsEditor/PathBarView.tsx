import { Tooltip } from "@material-ui/core";
import React, { useContext } from "react";
import styled from "styled-components";
import PathBreadcrumbs from "../../components/PathBreadcrumbs";
import { PropsListContext } from "./PropsListView";

const Container = styled.div`
  display: flex;
  background-color: ${({ theme }) => theme.palette.background.default};
  flex-direction: row;
  width: 100%;
  align-items: center;
`;

const StyledPathBreadcrumbs = styled(PathBreadcrumbs)`
  flex: 1;
  overflow: hidden;
  margin-left: 10px;
`;

const Ellipsis = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
`;

const TextSpan = styled.span`
  font-size: 14px;
`;

const PathBarView = React.memo(() => {
  const { selectedClass, selectedPropKey } = useContext(PropsListContext);

  const pathBreadcrumbs = React.useMemo(() => {
    let classDisplayEllipseName = "";
    const classDisplayFullName = selectedClass
      .substring(selectedClass.indexOf("com"))
      .replaceAll("/", ".");

    classDisplayEllipseName = classDisplayFullName
      .split(".")
      .reduceRight((acc, cur) => {
        if (acc.length >= 30) {
          return acc;
        }
        return `${cur}.${acc}`;
      });

    if (classDisplayEllipseName.length > 30) {
      classDisplayEllipseName = `...${classDisplayEllipseName.substr(
        classDisplayEllipseName.length - 30,
        30
      )}`;
    } else {
      classDisplayEllipseName = `...${classDisplayEllipseName}`;
    }

    return [
      {
        id: "className",
        value: () => (
          <Tooltip key="className" title={classDisplayFullName}>
            <TextSpan>{classDisplayEllipseName}</TextSpan>
          </Tooltip>
        ),
      },
      {
        id: "propName",
        value: () => (
          <Tooltip key="propName" title={selectedPropKey}>
            <Ellipsis>
              <TextSpan>{selectedPropKey}</TextSpan>
            </Ellipsis>
          </Tooltip>
        ),
      },
    ];
  }, [selectedClass, selectedPropKey]);

  if (!selectedClass || !selectedPropKey) {
    return null;
  }

  return (
    <Container>
      <StyledPathBreadcrumbs paths={pathBreadcrumbs} />
    </Container>
  );
});

export default PathBarView;

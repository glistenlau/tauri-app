import {
  Button,
  ButtonGroup,
  FormControlLabel,
  Switch,
  Tooltip
} from "@material-ui/core";
import React, { useCallback } from "react";
import styled from "styled-components";
import SVGIcon from "./SVGIcon";

interface DiffToolBarProps {
  activePair: [boolean, boolean];
  diffMode: boolean;
  className?: string;
  onActivePairChange: (activePair: [boolean, boolean]) => void;
  onToogleDiff: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
}

const Container = styled.div`
  margin-left: auto;
  display: flex;
  flex-direction: row;
  align-items: center;
`;
const ButtonGroupContainer = styled(ButtonGroup)`
  margin-left: 10px;
  margin-right: 10px;
`;

const DiffToolBar: React.FC<DiffToolBarProps> = ({ activePair, className, diffMode, onActivePairChange, onToogleDiff }) => {
  const handleActiveChange = useCallback(
    (valueOne: boolean, valueTwo: boolean) => {
      const newActivePair: [boolean, boolean] = [valueOne, valueTwo];
      onActivePairChange(newActivePair);
    },
    [onActivePairChange],
  )

  const handleClickLeft = useCallback(() => {
    handleActiveChange(!activePair[0], activePair[1]);
  }, [activePair, handleActiveChange])

  const handleClickRight = useCallback(() => {
    handleActiveChange(activePair[0], !activePair[1]);
  }, [activePair, handleActiveChange])

  const controlRenderer = React.useMemo(
    () => (
      <Switch checked={diffMode} value="diffCode" onChange={onToogleDiff} />
    ),
    [diffMode, onToogleDiff]
  );

  return (
    <Container className={className}>
      {!diffMode && <ButtonGroupContainer size="small">
        <Tooltip
          title={activePair[0] ? "Hide left editor" : "Show left editor"}
        >
          <Button
            variant={activePair[0] ? "contained" : "outlined"}
            onClick={handleClickLeft}
            style={{
              backgroundColor: activePair[0] ? "#d12e26" : undefined,
            }}
          >
            <SVGIcon
              name="database"
              fill={activePair[0] ? "white" : "#d12e26"}
              width={20}
              height={20}
            />
          </Button>
        </Tooltip>
        <Tooltip
          title={activePair[1] ? "Hide right editor" : "Show right editor"}
        >
          <Button
            variant={activePair[1] ? "contained" : "outlined"}
            onClick={handleClickRight}
            style={{
              backgroundColor: activePair[1] ? "#81c784" : undefined,
            }}
          >
            <SVGIcon name="postgres" width={20} height={20} />
          </Button>
        </Tooltip>
      </ButtonGroupContainer>
      }
      <FormControlLabel control={controlRenderer} label="Diff" />
    </Container>
  );
};

export default DiffToolBar;

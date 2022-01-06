import {
  Checkbox,
  Chip,
  CircularProgress, FormControl,
  InputLabel,
  MenuItem,
  Select
} from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import LabelWithDbIcons from "./LabelWithDbIcons";

const Container = styled.div`
  background-color: ${({ theme }) => theme.palette.background.default};
`;

const StyledFormControl = styled(FormControl)`
  width: 100%;
  margin-top: 10px;
`;
const StyledChip = styled(Chip)`
  margin-left: 10px;
  margin-bottom: 10px;
`;

const ActiveChip = styled(StyledChip)`
  background-color: #e1cefc;
  color: #711cf0;
`;

const StyledInputLabel = styled(InputLabel)`
  padding-left: 10px;
  padding-right: 10px;
`;

const ChipsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: -10px;
`;
const RefreshContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const RefreshText = styled.span`
  margin-left: 10px;
`;
export interface SchemaDropdownProps {
  schemas: [string[], string[]];
  selectedSchemas: string[];
  activeSchema: string;
  onChange: (selected: string[]) => void;
  onClickRefresh: () => Promise<void>;
  onClickSchema: (schema: string) => void;
  className?: any;
}

const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: 500,
    },
  },
};

const SELECT_ALL_VALUE = "__select_all__";
const REFRESH_VALUE = "__refresh__";

const SchemaDropdown: React.FC<SchemaDropdownProps> = React.memo(
  ({
    activeSchema,
    className,
    onChange,
    onClickRefresh,
    onClickSchema,
    selectedSchemas,
    schemas,
  }) => {
    const [refreshingSchema, setRefreshingSchema] = useState(false);
    const hasError = useMemo(
      () => selectedSchemas.length === 0,
      [selectedSchemas.length]
    );

    const schemaMap = useMemo(() => {
      if (!schemas) {
        return null;
      }

      const schemaMap = new Map();
      schemas[0].forEach((schemaName) => {
        const lowwerSchema = schemaName.toLowerCase();
        schemaMap.set(lowwerSchema, {
          value: lowwerSchema,
          showOracleIcon: true,
          showPostgresIcon: false,
        });
      });

      schemas[1].forEach((schemaName) => {
        const lowwerSchema = schemaName.toLowerCase();
        let mappedSchema = schemaMap.get(lowwerSchema);
        if (mappedSchema == null) {
          mappedSchema = {
            value: lowwerSchema,
            showOracleIcon: false,
            showPostgresIcon: true,
          };
          schemaMap.set(lowwerSchema, mappedSchema);
        } else {
          mappedSchema.showPostgresIcon = true;
        }
      });

      return schemaMap;
    }, [schemas]);

    const schemaMenuItems = useMemo(() => {
      if (schemaMap == null || schemaMap.size === 0) {
        return null;
      }

      const selectAll = (
        <MenuItem dense divider key={SELECT_ALL_VALUE} value={SELECT_ALL_VALUE}>
          <Checkbox
            checked={selectedSchemas.length === schemaMap.size}
          />
          <LabelWithDbIcons>
            Select All
          </LabelWithDbIcons>
        </MenuItem>
      )

      return [selectAll, ...Array.from(schemaMap.values())
        .sort((a, b) => a.value.localeCompare(b.value))
        .map((mappedSchema) => {
          return (
            <MenuItem dense key={mappedSchema.value} value={mappedSchema.value}>
              <Checkbox
                checked={selectedSchemas.indexOf(mappedSchema.value) > -1}
              />
              <LabelWithDbIcons
                showOracleIcon={mappedSchema.showOracleIcon}
                showPostgresIcon={mappedSchema.showPostgresIcon}
              >
                {mappedSchema.value}
              </LabelWithDbIcons>
            </MenuItem>
          );
        })];
    }, [schemaMap, selectedSchemas]);

    const handleChange = useCallback(
      (event) => {
        const { value } = event.target;
        const clickRefresh = value.indexOf(REFRESH_VALUE) > -1;
        if (clickRefresh) {
          return;
        }
        const checkSelectAll = value.indexOf(SELECT_ALL_VALUE) > -1;
        if (checkSelectAll && schemaMap != null) {
          if (selectedSchemas.length === schemaMap.size) {
            onChange([]);
          } else {
            const allValues = Array.from(schemaMap.values())
              .sort((a, b) => a.value.localeCompare(b.value))
              .map((mappedSchema) => mappedSchema.value);
            onChange(allValues);
          }
          return;

        }

        onChange(value);
      },
      [onChange, schemaMap, selectedSchemas.length]
    );

    const handleDeleteChip = useCallback(
      (schema) => {
        const filtered = selectedSchemas.filter(
          (selected) => selected !== schema
        );
        onChange(filtered);
      },
      [onChange, selectedSchemas]
    );

    const handleClickReresh = useCallback(async () => {
      if (refreshingSchema) {
        return;
      }

      setRefreshingSchema(true);
      try {
        await onClickRefresh();
      } finally {
        setRefreshingSchema(false);
      }
    }, [onClickRefresh, refreshingSchema]);

    const renderValue = useCallback(
      (selected: any) => (
        <ChipsContainer>
          {selected.map((selectedSchema: string) => {
            const ChipRenderer =
              activeSchema === selectedSchema ? ActiveChip : StyledChip;
            return (
              <ChipRenderer
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(e) => {
                  onClickSchema(selectedSchema);
                }}
                size="small"
                key={selectedSchema}
                label={
                  <LabelWithDbIcons
                    showOracleIcon={
                      schemaMap?.get(selectedSchema)?.showOracleIcon
                    }
                    showPostgresIcon={
                      schemaMap?.get(selectedSchema)?.showPostgresIcon
                    }
                  >
                    {selectedSchema}
                  </LabelWithDbIcons>
                }
                onDelete={(e) => {
                  handleDeleteChip(selectedSchema);
                }}
              />
            );
          })}
        </ChipsContainer>
      ),
      [activeSchema, handleDeleteChip, onClickSchema, schemaMap]
    );

    return (
      <Container>
        <StyledFormControl error={hasError}>
          <StyledInputLabel>Schemas</StyledInputLabel>
          <Select
            autoWidth
            multiple
            label="Schemas"
            value={selectedSchemas}
            onChange={handleChange}
            renderValue={renderValue}
          >
            <MenuItem
              dense
              divider
              disabled={refreshingSchema}
              key={REFRESH_VALUE}
              value={REFRESH_VALUE}
            >
              <RefreshContainer onClick={handleClickReresh}>
                {refreshingSchema ? (
                  <CircularProgress size={24} />
                ) : (
                  <RefreshIcon />
                )}
                <RefreshText>Refresh</RefreshText>
              </RefreshContainer>
            </MenuItem>
            {schemaMenuItems}
          </Select>
        </StyledFormControl>
      </Container>
    );
  }
);

export default SchemaDropdown;

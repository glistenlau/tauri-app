import { Typography } from "@material-ui/core";
import { Maybe } from "graphql/jsutils/Maybe";
import React from "react";
import MatchText from "../../components/MatchText";
import SVGIcon from "../../components/SVGIcon";
import Tooltip from "../../components/Tooltip";
import { DbFamily } from "../../generated/graphql";

interface SchemaTreeViewNodeLabelProps {
  onClick?: any;
  tagName?: string;
  attrName: Maybe<string>;
  highlight?: boolean;
  filterText?: string;
  tagColor?: string;
  dbFamily?: DbFamily;
}

const SchemaTreeViewNodeLabel = React.memo(
  ({
    highlight,
    onClick,
    tagName,
    attrName,
    filterText,
    tagColor,
    dbFamily,
  }: SchemaTreeViewNodeLabelProps) => {
    const [hover, setHover] = React.useState(false);

    const handleMouseOver = React.useCallback(() => {
      setHover(true);
    }, []);
    const handleMouseLeave = React.useCallback(() => {
      setHover(false);
    }, []);

    const tooltipTittle = React.useMemo(() => {
      let title = "";
      if (tagName) {
        title += tagName + " ";
      }
      if (attrName) {
        title += attrName;
      }
      return title;
    }, [tagName, attrName]);

    const backgroundColor = React.useMemo(() => {
      if (highlight) {
        return "rgba(98, 0, 238, .120)";
      }
      if (hover) {
        return "rgba(0, 0, 0, .04)";
      }
    }, [hover, highlight]);

    return (
      <Tooltip title={tooltipTittle}>
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            width: "10%",
            paddingLeft: 4,
            backgroundColor,
            cursor: "pointer",
          }}
          onMouseOver={handleMouseOver}
          onMouseLeave={handleMouseLeave}
          onClick={onClick}
        >
          <span
            style={{
              flex: 1,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {tagName && (
              <Typography
                component="span"
                style={{
                  color: highlight ? "#6200EE" : tagColor,
                }}
              >
                <MatchText text={tagName} highlightText={filterText || ""} />{" "}
              </Typography>
            )}
            {attrName && (
              <Typography
                style={{
                  color: highlight ? "#6200EE" : undefined,
                }}
                component="span"
              >
                <MatchText text={attrName} highlightText={filterText || ""} />
              </Typography>
            )}
          </span>
          {dbFamily &&
            (dbFamily === DbFamily.Both || dbFamily === DbFamily.Oracle) && (
              <SVGIcon
                style={{ flexShrink: 0, marginRight: 3 }}
                name="database"
                width={20}
                height={20}
              />
            )}
          {dbFamily &&
            (dbFamily === DbFamily.Both || dbFamily === DbFamily.Postgres) && (
              <SVGIcon
                style={{ flexShrink: 0, marginRight: 3 }}
                name="postgres"
                width={20}
                height={20}
              />
            )}
        </div>
      </Tooltip>
    );
  }
);

export default SchemaTreeViewNodeLabel;

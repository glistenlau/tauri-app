import React from "react";
import MTooltip from "@material-ui/core/Tooltip";

const Tooltip = React.forwardRef(
  ({ children, ...otherProps }: any, ref): any => (
    <MTooltip
      ref={ref}
      leaveDelay={100}
      enterNextDelay={500}
      enterDelay={3000}
      {...otherProps}
    >
      {children}
    </MTooltip>
  )
);

export default React.memo(Tooltip);

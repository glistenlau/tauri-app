import React from "react";
import { VariantType, useSnackbar } from "notistack";
import { connect } from "react-redux";

import { processedNotification } from "../actions";

interface NotificationProps {
  messages: {
    key: string;
    text: string;
    variant: VariantType;
  }[];
  dispatch: any;
}

const Notification = (props: any): any => {
  const { enqueueSnackbar } = useSnackbar();
  const processed = React.useRef(new Set());
  const { messages, dispatch } = props;

  React.useEffect(() => {
    if (!messages) {
      return;
    }

    messages.forEach((msg: any) => {
      if (processed.current.has(msg.key)) {
        return;
      }

      processed.current.add(msg.key);
      enqueueSnackbar(msg.text, {
        variant: msg.variant,
        onExit: () => {
          processed.current.delete(msg.key);
          dispatch(processedNotification(msg.key));
        },
      });
    });
  }, [messages, enqueueSnackbar, dispatch]);

  return null;
};

const mapStateToProps = (state: any) => {
  return {
    ...state.notification,
  };
};

export default React.memo(connect(mapStateToProps)(Notification));

import { ActionType } from "../actions";

const defaultState: NotificationState = {
  messages: [],
};

interface NotificationState {
  messages: any[];
}

const notification = (state: NotificationState = defaultState, action: any) => {
  switch (action.type) {
    case ActionType.ENQUEUE_NOTIFICATION: {
      const newMessage = {
        key: action.key,
        text: action.text,
        variant: action.variant,
      };
      const messages = [...(state.messages || []), newMessage];
      return { messages };
    }
    case ActionType.EXIT_NOTIFICATION: {
      const messages = (state.messages || []).filter(
        (msg) => msg.key !== action.key
      );
      return { messages };
    }
    default:
      return state;
  }
};

export default notification;

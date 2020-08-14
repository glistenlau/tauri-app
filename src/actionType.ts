enum ActionType {
  LOAD_PROPS_FILES = "LOAD_PROPS_FILES",
  LOAD_PERSISTOR = "LOAD_PERSISTOR",
  SELECT_CLASS_NAME = "SELECT_CLASS_NAME",
  SELECT_PROP_KEY = "SELECT_PROP_KEY",
  CHANGE_PROP_VALUE = "CHANGE_PROP_VALUE",
  CHANGE_SEARCH_FILE_PATH = "CHANGE_SEARCH_FILE_PATH",
  CHANGE_SEARCH_CLASS = "CHANGEM_SEARCH_CLASS",
  OPEN_PARAMETER_MODAL = "OPEN_PARAMETER_MODAL",
  CLOSE_PARAMETER_MODAL = "CLOSE_PARAMETER_MODAL",
  CHANGE_ACTIVE_VIEW = "CHANGE_ACTIVE_VIEW",
  CHANGE_PARAMETERS = "CHANGE_PARAMETERS",
  CHANGE_PARAMETER_RAW = "CHANGE_PARAMETER_RAW",
  CHANGE_LEFT_PANEL_WIDTH = "CHANGE_LEFT_PANEL_WIDTH",
  TOOGLE_CARTESIAN = "TOOGLE_CARTESIAN",
  CHANGE_ORACLE_SETTING = "CHANGE_ORACLE_SETTING",
  CHANGE_POSTGRES_SETTING = "CHANGE_POSTGRES_SETTING",
  TOOGLE_SYNC = "TOOGLE_SYNC",
  RUN_QUERY = "RUN_QUERY",
  INIT_APP = "INIT_APP",
  ENQUEUE_NOTIFICATION = "SHOW_NOTIFICATION",
  EXIT_NOTIFICATION = "PROCESSED_NOTIFICATION",
  RESET_APP = "RESET_APP",
}

export default ActionType;
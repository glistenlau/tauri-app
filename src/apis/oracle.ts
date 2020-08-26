import SqlCommon from "./sqlCommon";
import { OracleSettings } from "../features/settings/settingsSlice";

export class Oracle extends SqlCommon<OracleSettings> {
  constructor() {
    super("oracle");
  }
}


export default new Oracle();
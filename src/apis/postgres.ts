import SqlCommon from "./sqlCommon";
import { PostgreSettings } from "../features/settings/settingsSlice";

export class Postgres extends SqlCommon<PostgreSettings> {
  constructor() {
    super("postgres");
  }
}
export default new Postgres();

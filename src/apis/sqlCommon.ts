import { requestAsync } from ".";

enum Action {
    ExecuteStatement = "executeStatement",
    SetConfig = "setConfig",
}

interface Payload<C> {
    statement?: string;
    parameters?: string[];
    config?: C;
}

class SqlCommon<C> {
    handler: string;

    constructor(handler: string) {
        this.handler = handler;
    }

    sendRequest = async (action: Action, payload?: Payload<C>) => {
        const args: any = {
            action,
        };

        if (payload) {
            args.payload = payload;
        }

        return await requestAsync(this.handler, action, payload);
    };

    execute = async (statement: string, parameters: any[]) => {
        const payload = {
            statement,
            parameters,
        };

        return await this.sendRequest(Action.ExecuteStatement, payload);
    };

    setConfig = async (config: C) => {
        const payload = {
            config,
        };

        const res = await this.sendRequest(Action.SetConfig, payload);
        if (res.success) {
          return res;
        }
        throw new Error(res.result.message);
    };
}

export default SqlCommon;

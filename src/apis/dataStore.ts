import {
  DeleteRocksKeysDocument,
  DeleteRocksKeysMutation,
  DeleteRocksKeysMutationVariables,
  GetRocksValuesDocument,
  GetRocksValuesQuery,
  GetRocksValuesQueryVariables,
  SetRocksValuesDocument,
  SetRocksValuesMutation,
  SetRocksValuesMutationFn,
  SetRocksValuesMutationVariables,
} from "../generated/graphql";
import GraghQL, { getClient } from "./graphql";

class DataStore {
  getItem = async (key: string): Promise<string | undefined> => {
    const conn = getClient(await GraghQL.getServerPort());
    const result = await conn.query<
      GetRocksValuesQuery,
      GetRocksValuesQueryVariables
    >({ variables: { keys: [key] }, query: GetRocksValuesDocument });
    return result.data.getRocksdbValues[0] || undefined;
  };

  setItem = async (key: string, val: string) => {
    const conn = getClient(await GraghQL.getServerPort());
    await conn.mutate<SetRocksValuesMutation, SetRocksValuesMutationVariables>({
      variables: { keys: [key], values: [val] },
      mutation: SetRocksValuesDocument,
    });
  };

  removeItem = async (key: string) => {
    const conn = getClient(await GraghQL.getServerPort());
    await conn.mutate<
      DeleteRocksKeysMutation,
      DeleteRocksKeysMutationVariables
    >({ variables: { keys: [key] }, mutation: DeleteRocksKeysDocument });
  };
}

export default new DataStore();

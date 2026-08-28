import { apiFetch } from "../apiClient";
import type { DataResponse } from "../objects/base/dataResponse";

export async function getTotalExpenses(): Promise<number>{
    const test: DataResponse<number> = await apiFetch<number>("/receipt/total-expenses");

    return test.data!;
}
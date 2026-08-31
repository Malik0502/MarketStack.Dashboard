import { apiFetch } from "../apiClient";
import { DataResponse } from "../objects/base/dataResponse";

export async function getTotalExpenses(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/expense/total");

    if(!result.success && result.data == null){
        return 0;
    }

    return result.data!;
}

export async function getTotalTaxExpenses(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/expense/total-tax");

    if(!result.success && result.data == null){
        return 0;
    }

    return result.data!;
}

export async function getPercentageChangeLastWeek(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/expense/percentage-change");

    if(!result.success && result.data == null){
        return 0;
    }

    return result.data!;
}

export async function getTaxPercentageChangeLastWeek(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/expense/tax-percentage-change");

    if(!result.success && result.data == null){
        return 0;
    }

    return result.data!;
}
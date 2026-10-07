import { ParseDateToMonthString } from "@/common/parser/dateToMonthString";
import { apiFetch } from "../apiClient";
import type { DataResponse } from "../objects/base/dataResponse";
import type { MonthlyExpense } from "../objects/dto/monthlyExpense";

export async function getMonthlyExpenses(): Promise<MonthlyExpense[]> {
    const response: DataResponse<Record<string, MonthlyExpense>> =
        await apiFetch<Record<string, MonthlyExpense>>("/expense/history");

    if (!response.success || response.data == null) {
        return [];
    }

    const result: MonthlyExpense[] = Object.values(response.data);

    for (let index = 0; index < result.length; index++) {
        const element = result[index];
        element.purchasedAt = ParseDateToMonthString(element.purchasedAt);
    }

    return result.reverse();
}
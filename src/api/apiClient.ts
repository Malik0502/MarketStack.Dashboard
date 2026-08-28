import { API_URL } from "../common/config/constants";
import { DataResponse } from "./objects/base/dataResponse";

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<DataResponse<T>> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });

    const responseJson = await response.json();
    const result = responseJson as DataResponse<T>;

    if (!response.ok) {
        return DataResponse.createErrorMessage("Error", result.message, 5);
    }

    return result;
}
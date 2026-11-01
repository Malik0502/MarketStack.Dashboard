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

    // Some server errors return HTML or an empty body, not a response envelope.
    const result = await response.json().catch(() => null) as DataResponse<T> | null;

    if (!response.ok) {
        return DataResponse.createErrorResponse("Error", result?.message || `HTTP ${response.status}`, 5);
    }

    return result ?? DataResponse.createErrorResponse("Error", "Ungültige API-Antwort", 5);
}

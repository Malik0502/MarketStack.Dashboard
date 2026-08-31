import { apiFetch } from "../apiClient";
import { DataResponse } from "../objects/base/dataResponse";

export async function getTotalPurchases(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/receipt/total");
    
        if(!result.success && result.data == null){
            return 0;
        }
    
        return result.data!;
}

export async function getAveragePurchaseValue(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/receipt/average-purchase-value");
    
        if(!result.success && result.data == null){
            return 0;
        }
    
        return result.data!;
}

export async function getAverageItems(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/receipt/average-items");
    
        if(!result.success && result.data == null){
            return 0;
        }
    
        return result.data!;
}

export async function getDiscountShare(): Promise<number>{
    const result: DataResponse<number> = await apiFetch<number>("/receipt/discount-share");
    
        if(!result.success && result.data == null){
            return 0;
        }
    
        return result.data!;
}
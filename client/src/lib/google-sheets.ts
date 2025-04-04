import { SearchResult } from "@shared/schema";
import { apiRequest } from "./queryClient";

export async function searchSheetData(blockNo: string, partNo?: string, thickness?: string): Promise<SearchResult[]> {
  const params = new URLSearchParams();
  params.append('blockNo', blockNo);
  if (partNo) params.append('partNo', partNo);
  if (thickness) params.append('thickness', thickness);

  const response = await apiRequest('GET', `/api/search?${params}`);
  return response.json();
}
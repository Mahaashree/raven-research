import type {
  AgentRun,
  ClaimVerification,
  Collection,
  EquationDecodingResult,
  Item,
  ItemBoard,
  KnowledgeGraph,
  Project,
  Relation,
  ResurfacedCandidate,
  SearchResult,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listItems: () => request<Item[]>("/items"),
  createItem: (url: string) =>
    request<Item>("/items", { method: "POST", body: JSON.stringify({ url }) }),
  getItem: (id: string) => request<Item>(`/items/${id}`),
  deleteItem: (id: string) => request<{ item_id: string; deleted: boolean }>(`/items/${id}`, { method: "DELETE" }),
  search: (q: string, limit = 10) =>
    request<{ query: string; results: SearchResult[] }>(
      `/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),

  updateItem: (itemId: string, patch: { reading_status?: string; user_note?: string }) =>
    request<Item>(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify(patch) }),

  addTags: (itemId: string, tags?: string[]) =>
    request<{ item_id: string; tags: string[] }>(`/items/${itemId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tags: tags ?? null }),
    }),
  removeTag: (itemId: string, tag: string) =>
    request<{ item_id: string; removed: string }>(
      `/items/${itemId}/tags/${encodeURIComponent(tag)}`,
      { method: "DELETE" }
    ),

  createCollection: (name: string, description?: string, projectId?: string) =>
    request<Collection>("/collections", {
      method: "POST",
      body: JSON.stringify({ name, description: description ?? null, project_id: projectId ?? null }),
    }),
  listCollections: (projectId?: string) =>
    request<Collection[]>(`/collections${projectId ? `?project_id=${projectId}` : ""}`),
  addToCollection: (collectionId: string, itemId: string) =>
    request<Collection>(`/collections/${collectionId}/items`, {
      method: "POST",
      body: JSON.stringify({ item_id: itemId }),
    }),
  getCollection: (id: string) => request<Collection>(`/collections/${id}`),

  listProjects: () => request<Project[]>("/projects"),
  createProject: (name: string, color: string) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify({ name, color }) }),

  findRelations: (itemId: string) =>
    request<{ item_id: string; candidates_considered: number; relations_created: unknown[] }>(
      `/items/${itemId}/find-relations`,
      { method: "POST" }
    ),
  getRelations: (itemId: string) =>
    request<{ item_id: string; relations: Relation[] }>(`/items/${itemId}/relations`),
  getItemBoards: (itemId: string) =>
    request<{ item_id: string; boards: ItemBoard[] }>(`/items/${itemId}/boards`),

  agentQuery: (query: string) =>
    request<AgentRun>("/agent/query", { method: "POST", body: JSON.stringify({ query }) }),
  gapFinder: (topic: string) =>
    request<AgentRun>("/agent/gap-finder", { method: "POST", body: JSON.stringify({ topic }) }),

  verifyClaim: (itemId: string, claim: string) =>
    request<ClaimVerification>(`/items/${itemId}/verify-claim`, {
      method: "POST",
      body: JSON.stringify({ claim }),
    }),

  knowledgeGraph: () => request<KnowledgeGraph>("/knowledge-graph"),
  knowledgeGraphForItem: (itemId: string) =>
    request<KnowledgeGraph>(`/knowledge-graph/${itemId}`),

  getResurfaced: (stalenessDays = 14, limit = 3) =>
    request<{ candidates: ResurfacedCandidate[] }>(
      `/desk/resurfaced?staleness_days=${stalenessDays}&limit=${limit}`
    ),

  decodeEquation: (itemId: string, equationText: string) =>
    request<EquationDecodingResult>(`/items/${itemId}/decode-equation`, {
      method: "POST",
      body: JSON.stringify({ equation_text: equationText }),
    }),
};

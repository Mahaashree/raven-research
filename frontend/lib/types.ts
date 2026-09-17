export type ItemType = "paper" | "article" | "blog";
export type ItemStatus = "pending" | "processed" | "failed";
export type ReadingStatus = "active" | "done";

export interface Item {
  id: string;
  url: string;
  title: string | null;
  type: ItemType;
  saved_at: string;
  status: ItemStatus;
  error_message: string | null;
  reading_status: ReadingStatus;
  user_note: string | null;
  last_viewed_at?: string | null;
  summary_text?: string | null;
  key_claims?: string[] | null;
  method?: string | null;
  tags?: string[];
  board_position?: number;
}

export interface SearchResult {
  id: string;
  url: string;
  title: string | null;
  type: ItemType;
  saved_at: string;
  summary_text: string;
  key_claims: string[];
  method: string | null;
  similarity: number;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: string;
  board_count: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  project_id: string | null;
  project_name?: string | null;
  created_at: string;
  items: Item[];
  item_count: number;
}

export interface ItemBoard {
  id: string;
  name: string;
  item_count: number;
  board_position: number;
}

export type RelationType = "supports" | "contradicts" | "extends";

export interface Relation {
  id: string;
  relation_type: RelationType;
  note: string | null;
  created_at: string;
  as_source: boolean;
  other_item_id: string;
  other_item_url: string;
  other_item_title: string | null;
}

export interface AgentRun {
  id: string;
  query: string;
  answer: string | null;
  tools_used: string[];
  item_ids_used: string[];
  error_message: string | null;
  created_at: string;
}

export type ClaimVerdict = "supported" | "unsupported" | "partially_supported";

export interface ClaimVerification {
  id: string;
  item_id: string;
  claim: string;
  verdict: ClaimVerdict;
  explanation: string;
  quoted_evidence: string | null;
  checked_at: string;
  cached: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  url: string;
  type: ItemType;
  reading_status: ReadingStatus;
  connections: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation_type: RelationType;
  note: string | null;
}

export interface KnowledgeGraphStats {
  total_nodes: number;
  rabbit_holes: number;
  archived: number;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: KnowledgeGraphStats;
}

export interface ResurfacedCandidate {
  id: string;
  url: string;
  title: string | null;
  type: ItemType;
  saved_at: string;
  last_viewed_at: string | null;
  summary_text: string;
  key_claims: string[];
  method: string | null;
  relation_count: number;
}

export interface EquationDecoding {
  pronunciation: string;
  variable_types: Record<string, string>;
  plain_language: string;
  tiny_example: string;
  role_in_paper: string;
}

export interface EquationDecodingResult {
  id: string;
  item_id: string;
  equation_text: string;
  decoding: EquationDecoding;
  created_at: string;
  cached: boolean;
}

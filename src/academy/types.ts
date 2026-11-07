export type Fig = { k: string; p?: Record<string, unknown>; caption?: string };
export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "list"; items: string[] }
  | { t: "steps"; items: { titolo?: string; text: string; fig?: Fig }[] }
  | { t: "dodont"; si: string[]; no: string[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "tip"; text: string }
  | { t: "fig"; fig: Fig };
export type Lesson = { id: string; titolo: string; minuti: number; intro: string; blocks: Block[] };
export type Course = { id: string; titolo: string; sottotitolo: string; icona: string; lezioni: Lesson[] };

/** What the public main area is showing. Search overrides all of these. */
export type View =
  | { kind: "all" }
  | { kind: "group"; id: string }
  | { kind: "category"; id: string }
  | { kind: "posts" }
  | { kind: "links" };

export const ALL_VIEW: View = { kind: "all" };

export function isSameView(a: View, b: View): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "group" || a.kind === "category") {
    return a.id === (b as { id: string }).id;
  }
  return true;
}

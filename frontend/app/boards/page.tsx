import { Suspense } from "react";
import BoardsClient from "./BoardsClient";

export default function BoardsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-warm">Loading…</p>}>
      <BoardsClient />
    </Suspense>
  );
}

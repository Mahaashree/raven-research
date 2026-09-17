"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMascot } from "./MascotProvider";
import { Button, Input, Panel } from "./ui";

export default function AddItemModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const mascot = useMascot();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || saving) return;
    setSaving(true);
    mascot.setLoading();
    try {
      await api.createItem(url.trim());
      mascot.flashSuccess();
      setUrl("");
      onClose();
      router.push("/");
      router.refresh();
    } catch {
      mascot.reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md mx-4">
        <Panel raised className="p-6">
          <h2 className="font-display text-2xl mb-1">Save something</h2>
          <p className="text-sm text-warm mb-5">
            Paste a URL — arXiv, journal article, PDF, or blog post.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
            <div className="flex justify-end gap-2 mt-1">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !url.trim()}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

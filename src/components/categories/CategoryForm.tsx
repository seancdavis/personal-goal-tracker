import { useState } from "react";
import { categoriesApi } from "@/lib/api";
import type { Category } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

interface CategoryFormProps {
  category?: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryForm({ category, onClose, onSaved }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!category;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing) {
        await categoriesApi.update(category.id, { name: name.trim() });
      } else {
        await categoriesApi.create({ name: name.trim() });
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
      setSaving(false);
    }
  }

  return (
    <Modal title={isEditing ? "Edit Category" : "Add Category"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner size="sm" className="mr-2" />}
            {isEditing ? "Save" : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

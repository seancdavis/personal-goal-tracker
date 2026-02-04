import { useState } from "react";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import { categoriesApi } from "@/lib/api";
import type { Category } from "@/types";
import { useCategories } from "@/contexts/CategoriesContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AsyncSection } from "@/components/ui/AsyncSection";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { CategoryForm } from "@/components/categories/CategoryForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function CategoriesListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function Categories() {
  const categories = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    try {
      await categoriesApi.delete(id);
      setDeletingCategoryId(null);
      categories.refetch();
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  }

  const sortedCategories = categories.data
    ? [...categories.data].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div className="space-y-6">
      {/* Header - renders immediately */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-gray-600">
            Organize your tasks and recurring items
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Categories List */}
      <AsyncSection
        data={categories.data}
        loading={categories.loading}
        error={categories.error}
        onRetry={categories.refetch}
        loadingElement={<CategoriesListSkeleton />}
        emptyElement={
          <Card className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No categories yet. Create categories to organize your tasks.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Category
            </Button>
          </Card>
        }
      >
        {() => (
          <div className="space-y-2">
            {sortedCategories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                onEdit={() => {
                  setEditingCategory(category);
                  setShowForm(true);
                }}
                onDelete={() => setDeletingCategoryId(category.id)}
              />
            ))}
          </div>
        )}
      </AsyncSection>

      {showForm && (
        <CategoryForm
          category={editingCategory}
          onClose={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditingCategory(null);
            categories.refetch();
          }}
        />
      )}

      {deletingCategoryId !== null && (
        <ConfirmDialog
          title="Delete Category"
          message="Are you sure you want to delete this category? Tasks using this category will become uncategorized."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDelete(deletingCategoryId)}
          onCancel={() => setDeletingCategoryId(null)}
        />
      )}
    </div>
  );
}

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <FolderOpen className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

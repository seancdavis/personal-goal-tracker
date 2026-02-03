import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronRight, GripVertical } from "lucide-react";
import { backlogApi, categoriesApi } from "@/lib/api";
import type { BacklogItem, Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { BacklogForm } from "@/components/backlog/BacklogForm";

export function Backlog() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [itemsData, categoriesData] = await Promise.all([
        backlogApi.list(),
        categoriesApi.list(),
      ]);
      setItems(itemsData.sort((a, b) => a.priority - b.priority));
      setCategories(categoriesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backlog");
    } finally {
      setLoading(false);
    }
  }

  function getCategoryName(categoryId: number | null): string | null {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId)?.name ?? null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backlog</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-600 mb-4">
            Your backlog is empty. Add items for future weeks.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Item
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const categoryName = getCategoryName(item.categoryId);
            return (
              <Link key={item.id} to={`/backlog/${item.id}`}>
                <Card className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-center w-6 h-6 text-gray-400">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-gray-400 w-6">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    {categoryName && (
                      <Badge variant="secondary" className="mt-1">
                        {categoryName}
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <BacklogForm
          categories={categories}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

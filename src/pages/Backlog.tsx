import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronRight, GripVertical } from "lucide-react";
import { backlogApi } from "@/lib/api";
import type { BacklogItem } from "@/types";
import { useAsyncData } from "@/hooks";
import { useCategories } from "@/contexts/CategoriesContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AsyncSection } from "@/components/ui/AsyncSection";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { BacklogForm } from "@/components/backlog/BacklogForm";

function BacklogListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function Backlog() {
  const fetchItems = useCallback(async () => {
    const data = await backlogApi.list();
    return data.sort((a, b) => a.priority - b.priority);
  }, []);
  const items = useAsyncData(fetchItems);
  const categories = useCategories();

  const [showForm, setShowForm] = useState(false);

  function getCategoryName(categoryId: number | null): string | null {
    if (!categoryId || !categories.data) return null;
    return categories.data.find((c) => c.id === categoryId)?.name ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Header - renders immediately */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Backlog</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* Backlog List */}
      <AsyncSection
        data={items.data}
        loading={items.loading}
        error={items.error}
        onRetry={items.refetch}
        loadingElement={<BacklogListSkeleton />}
        emptyElement={
          <Card className="text-center py-12">
            <p className="text-gray-600 mb-4">
              Your backlog is empty. Add items for future weeks.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Item
            </Button>
          </Card>
        }
      >
        {(itemsList) => (
          <div className="space-y-2">
            {itemsList.map((item, index) => (
              <BacklogRow
                key={item.id}
                item={item}
                index={index}
                categoryName={getCategoryName(item.categoryId)}
              />
            ))}
          </div>
        )}
      </AsyncSection>

      {showForm && categories.data && (
        <BacklogForm
          categories={categories.data}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            items.refetch();
          }}
        />
      )}
    </div>
  );
}

function BacklogRow({
  item,
  index,
  categoryName,
}: {
  item: BacklogItem;
  index: number;
  categoryName: string | null;
}) {
  return (
    <Link to={`/backlog/${item.id}`}>
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
}

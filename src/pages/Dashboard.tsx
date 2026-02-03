import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Calendar, ChevronRight } from "lucide-react";
import { weeksApi } from "@/lib/api";
import { formatWeekRange, getCurrentWeekId } from "@/lib/dates";
import { calculatePercentage, getScoreLevel, getScoreClasses } from "@/lib/scores";
import type { Week } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { ScoreIndicator } from "@/components/weeks/ScoreIndicator";

export function Dashboard() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeeks();
  }, []);

  async function loadWeeks() {
    try {
      setLoading(true);
      const data = await weeksApi.list();
      setWeeks(data.sort((a, b) => b.id.localeCompare(a.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load weeks");
    } finally {
      setLoading(false);
    }
  }

  const currentWeekId = getCurrentWeekId();
  const currentWeek = weeks.find((w) => w.id === currentWeekId);

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
        <Button onClick={loadWeeks}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/weeks/new">
          <Button>
            <Plus className="w-4 h-4 mr-1.5" />
            New Week
          </Button>
        </Link>
      </div>

      {currentWeek && (
        <Card className="p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Current Week</p>
                <p className="text-lg font-semibold">{formatWeekRange(currentWeek.id)}</p>
              </div>
              <ScoreIndicator
                completed={currentWeek.completedTasks}
                total={currentWeek.totalTasks}
                size="lg"
              />
            </div>
          </div>
          <div className="px-6 py-4">
            <Link
              to={`/weeks/${currentWeek.id}`}
              className="flex items-center justify-between text-sm font-medium text-green-600 hover:text-green-700"
            >
              <span>View week details</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </Card>
      )}

      {!currentWeek && weeks.length === 0 && (
        <Card className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">No weeks yet</h2>
          <p className="text-gray-600 mb-4">Create your first week to get started.</p>
          <Link to="/weeks/new">
            <Button>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Week
            </Button>
          </Link>
        </Card>
      )}

      {weeks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">All Weeks</h2>
          <div className="space-y-2">
            {weeks.map((week) => {
              const percentage = calculatePercentage(
                week.completedTasks,
                week.totalTasks
              );
              const level = getScoreLevel(percentage);
              const isCurrent = week.id === currentWeekId;

              return (
                <Link key={week.id} to={`/weeks/${week.id}`}>
                  <Card
                    className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
                      isCurrent ? "ring-2 ring-green-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border ${getScoreClasses(
                          level
                        )}`}
                      >
                        {percentage}%
                      </div>
                      <div>
                        <p className="font-medium">{formatWeekRange(week.id)}</p>
                        <p className="text-sm text-gray-500">
                          {week.completedTasks} of {week.totalTasks} tasks
                          {isCurrent && (
                            <span className="ml-2 text-green-600 font-medium">
                              Current
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

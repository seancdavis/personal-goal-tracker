import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { weekGenerationApi, weeksApi } from "@/lib/api";
import { getCurrentWeekId, getNextWeekId, formatWeekRange } from "@/lib/dates";
import type {
  WizardRecurringTask,
  WizardIncompleteTask,
  WizardFollowUp,
  WizardBacklogItem,
} from "@/types";
import { useAsyncData } from "@/hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { AsyncSection } from "@/components/ui/AsyncSection";
import { Skeleton } from "@/components/ui/Skeleton";
import { WizardStep1Recurring } from "@/components/wizard/WizardStep1Recurring";
import { WizardStep2Incomplete } from "@/components/wizard/WizardStep2Incomplete";
import { WizardStep3FollowUps } from "@/components/wizard/WizardStep3FollowUps";
import { WizardStep4Backlog } from "@/components/wizard/WizardStep4Backlog";

const STEPS = [
  { id: 1, title: "Recurring Tasks" },
  { id: 2, title: "Incomplete Tasks" },
  { id: 3, title: "Follow-ups" },
  { id: 4, title: "Backlog" },
];

interface WizardData {
  newWeekId: string;
  previousWeekId: string;
  recurringTasks: WizardRecurringTask[];
  incompleteTasks: WizardIncompleteTask[];
  followUps: WizardFollowUp[];
  backlogItems: WizardBacklogItem[];
}

function WizardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <Skeleton className="w-8 h-8 rounded-full" />
            {i < 4 && <Skeleton className="w-12 h-0.5 mx-1" />}
          </div>
        ))}
      </div>
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-8" />
        </div>
      </Card>
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function WeekWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recurringTasks, setRecurringTasks] = useState<WizardRecurringTask[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<WizardIncompleteTask[]>([]);
  const [followUps, setFollowUps] = useState<WizardFollowUp[]>([]);
  const [backlogItems, setBacklogItems] = useState<WizardBacklogItem[]>([]);
  const [newWeekId, setNewWeekId] = useState("");

  const fetchWizardData = useCallback(async (): Promise<WizardData> => {
    // Determine which week to create
    const weeks = await weeksApi.list();
    const sortedWeeks = weeks.sort((a, b) => b.id.localeCompare(a.id));
    const latestWeek = sortedWeeks[0];

    let prevWeekId: string;
    let targetWeekId: string;

    if (latestWeek) {
      prevWeekId = latestWeek.id;
      targetWeekId = getNextWeekId(latestWeek.id);
    } else {
      prevWeekId = "";
      targetWeekId = getCurrentWeekId();
    }

    // Load generation data
    const data = prevWeekId
      ? await weekGenerationApi.getData(prevWeekId)
      : await weekGenerationApi.getData("");

    return {
      newWeekId: targetWeekId,
      previousWeekId: prevWeekId,
      recurringTasks: data.recurringTasks,
      incompleteTasks: data.incompleteTasks,
      followUps: data.followUps,
      backlogItems: data.backlogItems,
    };
  }, []);

  const wizardData = useAsyncData(fetchWizardData, {
    deps: [],
  });

  // Sync local state when data loads
  if (wizardData.data && newWeekId !== wizardData.data.newWeekId) {
    setNewWeekId(wizardData.data.newWeekId);
    setRecurringTasks(wizardData.data.recurringTasks);
    setIncompleteTasks(wizardData.data.incompleteTasks);
    setFollowUps(wizardData.data.followUps);
    setBacklogItems(wizardData.data.backlogItems);
  }

  function toggleRecurring(id: number) {
    setRecurringTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  }

  function toggleIncomplete(id: number) {
    setIncompleteTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  }

  function toggleFollowUp(id: number) {
    setFollowUps((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  }

  function toggleBacklog(id: number) {
    setBacklogItems((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  }

  const selectedCount =
    recurringTasks.filter((t) => t.selected).length +
    incompleteTasks.filter((t) => t.selected).length +
    followUps.filter((t) => t.selected).length +
    backlogItems.filter((t) => t.selected).length;

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError(null);
      const week = await weekGenerationApi.generate({
        weekId: newWeekId,
        recurringTaskIds: recurringTasks.filter((t) => t.selected).map((t) => t.id),
        incompleteTaskIds: incompleteTasks.filter((t) => t.selected).map((t) => t.id),
        followUpIds: followUps.filter((t) => t.selected).map((t) => t.id),
        backlogItemIds: backlogItems.filter((t) => t.selected).map((t) => t.id),
      });
      navigate(`/weeks/${week.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate week");
      setGenerating(false);
    }
  }

  return (
    <AsyncSection
      data={wizardData.data}
      loading={wizardData.loading}
      error={wizardData.error}
      onRetry={wizardData.refetch}
      loadingElement={<WizardSkeleton />}
    >
      {() => (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Create New Week</h1>
            <p className="text-gray-600">{formatWeekRange(newWeekId)}</p>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => setStep(s.id)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    step === s.id
                      ? "bg-green-600 text-white"
                      : step > s.id
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.id}
                </button>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-1 ${
                      step > s.id ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Task Counter */}
          <Card className="p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Selected tasks for new week:</span>
              <span className="text-2xl font-bold text-green-600">
                {selectedCount}
              </span>
            </div>
          </Card>

          {/* Error */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-600">{error}</p>
            </Card>
          )}

          {/* Step Content */}
          <Card className="p-6">
            {step === 1 && (
              <WizardStep1Recurring tasks={recurringTasks} onToggle={toggleRecurring} />
            )}
            {step === 2 && (
              <WizardStep2Incomplete
                tasks={incompleteTasks}
                onToggle={toggleIncomplete}
              />
            )}
            {step === 3 && (
              <WizardStep3FollowUps followUps={followUps} onToggle={toggleFollowUp} />
            )}
            {step === 4 && (
              <WizardStep4Backlog items={backlogItems} onToggle={toggleBacklog} />
            )}
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {step < 4 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                Generate Week
              </Button>
            )}
          </div>
        </div>
      )}
    </AsyncSection>
  );
}

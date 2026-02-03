import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { generateWeekApi, weeksApi } from "@/lib/api";
import { getCurrentWeekId, getNextWeekId, formatWeekRange } from "@/lib/dates";
import type {
  WizardRecurringTask,
  WizardIncompleteTask,
  WizardFollowUp,
  WizardBacklogItem,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
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

export function WeekWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newWeekId, setNewWeekId] = useState("");
  const [_previousWeekId, setPreviousWeekId] = useState("");

  const [recurringTasks, setRecurringTasks] = useState<WizardRecurringTask[]>(
    []
  );
  const [incompleteTasks, setIncompleteTasks] = useState<WizardIncompleteTask[]>(
    []
  );
  const [followUps, setFollowUps] = useState<WizardFollowUp[]>([]);
  const [backlogItems, setBacklogItems] = useState<WizardBacklogItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

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
        // No weeks exist, create current week
        prevWeekId = "";
        targetWeekId = getCurrentWeekId();
      }

      setPreviousWeekId(prevWeekId);
      setNewWeekId(targetWeekId);

      // Load generation data if we have a previous week
      if (prevWeekId) {
        const data = await generateWeekApi.getData(prevWeekId);
        setRecurringTasks(data.recurringTasks);
        setIncompleteTasks(data.incompleteTasks);
        setFollowUps(data.followUps);
        setBacklogItems(data.backlogItems);
      } else {
        // Fresh start - just load recurring tasks
        const data = await generateWeekApi.getData("");
        setRecurringTasks(data.recurringTasks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
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
      const week = await generateWeekApi.generate({
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
  );
}

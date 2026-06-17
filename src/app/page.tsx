import { PageHeader } from "@/components/page-header";
import { TimerBar } from "@/components/timer-bar";
import { EntriesList } from "@/components/entries-list";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <PageHeader
        title="Time Tracker"
        description="Track time, organize by project, stay in flow."
      />
      <TimerBar />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <EntriesList />
      </div>
    </div>
  );
}

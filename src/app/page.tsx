import { APP_NAME } from "@/lib/brand";
import { PageHeader } from "@/components/page-header";
import { PageScroll } from "@/components/page-scroll";
import { TimerBar } from "@/components/timer-bar";
import { EntriesList } from "@/components/entries-list";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <PageHeader
        title={APP_NAME}
        description="Track time, organize by project, stay in flow."
      />
      <TimerBar />
      <PageScroll>
        <EntriesList />
      </PageScroll>
    </div>
  );
}

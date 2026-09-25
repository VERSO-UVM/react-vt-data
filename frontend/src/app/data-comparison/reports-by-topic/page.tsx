import ReportsByTopic from './ReportsByTopic';
import { DEFAULT_SECTION } from './topics';

// The bare /reports-by-topic/ URL (header and menu links) opens the default
// topic; each topic also has its own page under [topic]/.
export default function ReportsByTopicPage() {
  return <ReportsByTopic section={DEFAULT_SECTION} />;
}

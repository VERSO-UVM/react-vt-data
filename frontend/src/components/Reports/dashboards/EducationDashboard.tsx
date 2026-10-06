import { ComparisonBarChart, ReportSection } from '@/components/Reports/shared';

const EDUCATION_CATEGORIES = [
  'No High School Diploma',
  'High School Graduate',
  'Some College, No Degree',
  "Associate's Degree",
  "Bachelor's Degree",
  'Postgraduate Degree',
];

// TODO: Add more charts and tables for educational attainment dashboard (from dept of education data?)
export default function EducationDashboard() {
  return (
    <ReportSection intro eyebrow="Education" title="Educational attainment">
      <ComparisonBarChart
        title="Educational Attainment"
        categories={EDUCATION_CATEGORIES}
        horizontal
        labelWidth={180}
      />
    </ReportSection>
  );
}

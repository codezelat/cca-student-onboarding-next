import CenteredLoader from "@/components/ui/centered-loader";

export default function AdminSegmentLoading() {
  return (
    <div className="min-h-screen bg-linear-to-br from-violet-50 via-purple-50 to-indigo-50">
      <CenteredLoader label="Loading admin area..." className="min-h-screen" />
    </div>
  );
}

export default function AgentLoading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-56 rounded-lg" />
      <div className="skeleton h-12 w-full rounded-xl" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Job {id}</h1>
    </main>
  );
}

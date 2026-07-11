type Props = {
  params: Promise<{ assignmentId: string }>
}

export default async function Page({ params }: Props) {
  const { assignmentId } = await params
  return (
    <main>
      <h1>Declaration</h1>
      <p>{assignmentId}</p>
    </main>
  )
}

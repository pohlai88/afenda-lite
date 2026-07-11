type Props = {
  searchParams: Promise<{ invitationId?: string }>
}

export default async function Page({ searchParams }: Props) {
  const { invitationId } = await searchParams
  return (
    <main>
      <h1>Join</h1>
      <p>{invitationId ?? '(no invitationId)'}</p>
    </main>
  )
}

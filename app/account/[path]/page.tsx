type Props = {
  params: Promise<{ path: string }>
}

export default async function Page({ params }: Props) {
  const { path } = await params
  return (
    <main>
      <h1>Account</h1>
      <p>{path}</p>
    </main>
  )
}

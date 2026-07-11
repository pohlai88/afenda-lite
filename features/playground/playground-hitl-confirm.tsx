'use client'

/**
 * Shared HITL confirm control — shadcn Field + Checkbox + Badge.
 * Used on `/playground/hitl-review` rows and `/playground/[screenId]` preview chrome.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode
} from 'react'

import { Badge } from '@/components-V2/platform-components/ui/badge'
import { Button } from '@/components-V2/platform-components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components-V2/platform-components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components-V2/platform-components/ui/select'
import { Textarea } from '@/components-V2/platform-components/ui/textarea'
import { cn } from '@/components-V2/lib/utils'
import {
  PLAYGROUND_HITL_CHANGE_EVENT,
  PLAYGROUND_HITL_NOTE_MAX_LENGTH,
  PLAYGROUND_HITL_STORAGE_KEY,
  buildPlaygroundHitlFingerprint,
  readPlaygroundHitlReviews,
  resolvePlaygroundHitlMark,
  setPlaygroundHitlReview,
  writePlaygroundHitlReviews,
  type PlaygroundHitlMark,
  type PlaygroundHitlReviews,
  type PlaygroundHitlVerdict
} from '@/features/playground/playground-hitl-rows'
import type { PlaygroundPageShape } from '@/features/playground/playground-page-shape'
import type { PlaygroundRouteReviewDefinition } from '@/features/playground/playground-route-review'
import { PlaygroundPageShapeBadge } from '@/features/playground/playground-page-shape-badge'

const MARK_LABEL: Record<PlaygroundHitlMark, string> = {
  pending: 'Not reviewed',
  matches: 'Observed as documented',
  'needs-repair': 'Needs repair',
  obsolete: 'Obsolete'
}

const MARK_BADGE_CLASS: Record<PlaygroundHitlMark, string> = {
  pending: 'bg-muted text-muted-foreground',
  matches: 'bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400',
  'needs-repair': 'bg-red-600/10 text-red-700 dark:bg-red-400/10 dark:text-red-400',
  obsolete: 'bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400'
}

export function PlaygroundHitlMarkBadge({
  mark,
  className
}: {
  mark: PlaygroundHitlMark
  className?: string
}) {
  return (
    <Badge
      data-hitl-mark={mark}
      className={cn('h-auto rounded-sm border-none capitalize', MARK_BADGE_CLASS[mark], className)}
    >
      {MARK_LABEL[mark]}
    </Badge>
  )
}

function usePlaygroundHitlReviewsStore() {
  const [reviews, setReviews] = useState<PlaygroundHitlReviews>({})
  const [hydrated, setHydrated] = useState(false)

  const refresh = useCallback(() => {
    setReviews(readPlaygroundHitlReviews())
    setHydrated(true)
  }, [])

  useEffect(() => {
    refresh()

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === PLAYGROUND_HITL_STORAGE_KEY) {
        refresh()
      }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener(PLAYGROUND_HITL_CHANGE_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(PLAYGROUND_HITL_CHANGE_EVENT, refresh)
    }
  }, [refresh])

  const setReview = useCallback(
    (
      screenId: string,
      fingerprint: string,
      update: { verdict?: PlaygroundHitlVerdict | null; note?: string }
    ) => {
      setReviews(() => {
        const latest = readPlaygroundHitlReviews()
        const next = setPlaygroundHitlReview(latest, screenId, fingerprint, update)
        writePlaygroundHitlReviews(next)
        return next
      })
    },
    []
  )

  return { reviews, hydrated, setReview, refresh }
}

type PlaygroundHitlReviewsStore = ReturnType<typeof usePlaygroundHitlReviewsStore>

const PlaygroundHitlReviewsContext = createContext<PlaygroundHitlReviewsStore | null>(null)

export function PlaygroundHitlReviewsProvider({ children }: { children: ReactNode }) {
  const store = usePlaygroundHitlReviewsStore()
  return (
    <PlaygroundHitlReviewsContext.Provider value={store}>
      {children}
    </PlaygroundHitlReviewsContext.Provider>
  )
}

export function usePlaygroundHitlReviews() {
  const store = useContext(PlaygroundHitlReviewsContext)
  if (!store) {
    throw new Error('usePlaygroundHitlReviews requires PlaygroundHitlReviewsProvider')
  }
  return store
}

type PlaygroundHitlConfirmProps = {
  screenId: string
  label: string
  path: string
  pathConfigured: boolean
  shape?: PlaygroundPageShape
  review?: PlaygroundRouteReviewDefinition | null
  /** Compact for table cells; card for individual screen chrome. */
  variant?: 'compact' | 'card'
  className?: string
}

function markDescription(mark: PlaygroundHitlMark) {
  if (mark === 'matches') {
    return 'Human observation matches the current source contract; any registered repair action still applies.'
  }
  if (mark === 'needs-repair') {
    return 'Human review found a mismatch or unfinished product work.'
  }
  if (mark === 'obsolete') {
    return 'The route expectation changed after the previous review. Review it again.'
  }
  return 'Open the route, compare it with the source expectation, then record a verdict.'
}

export function PlaygroundHitlConfirm({
  screenId,
  label,
  path,
  pathConfigured,
  shape,
  review = null,
  variant = 'card',
  className
}: PlaygroundHitlConfirmProps) {
  const id = useId()
  const [noteOpen, setNoteOpen] = useState(false)
  const { reviews, hydrated, setReview } = usePlaygroundHitlReviews()
  const fingerprint = buildPlaygroundHitlFingerprint(path, pathConfigured, shape, review)
  const record = reviews[screenId]
  const mark = resolvePlaygroundHitlMark(record, fingerprint)
  const [noteDraft, setNoteDraft] = useState('')
  const selectedVerdict = mark === 'matches' || mark === 'needs-repair' ? mark : 'pending'

  return (
    <div
      data-playground-hitl-confirm
      data-hitl-mark={hydrated ? mark : 'pending'}
      data-playground-shape={shape}
      className={cn(
        variant === 'card' && 'bg-muted/30 rounded-lg border px-4 py-3',
        className
      )}
    >
      {variant === 'card' && shape ? (
        <div className='mb-3'>
          <PlaygroundPageShapeBadge shape={shape} showDescription />
        </div>
      ) : null}
      <div className='flex min-w-0 flex-col gap-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <Select
            items={[
              { label: 'Not reviewed', value: 'pending' },
              { label: 'Observed as documented', value: 'matches' },
              { label: 'Needs repair', value: 'needs-repair' }
            ]}
            value={selectedVerdict}
            disabled={!hydrated}
            onValueChange={value => {
              const verdict =
                value === 'matches' || value === 'needs-repair'
                  ? (value as PlaygroundHitlVerdict)
                  : null
              setReview(screenId, fingerprint, { verdict })
            }}
          >
            <SelectTrigger
              id={id}
              size='sm'
              className='min-w-44'
              aria-label={`Human verdict for ${label}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value='pending'>Not reviewed</SelectItem>
                <SelectItem value='matches'>Observed as documented</SelectItem>
                <SelectItem value='needs-repair'>Needs repair</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {hydrated ? <PlaygroundHitlMarkBadge mark={mark} /> : null}
          <Dialog
            open={noteOpen}
            onOpenChange={open => {
              setNoteOpen(open)
              if (open) {
                setNoteDraft(record?.note ?? '')
              }
            }}
          >
            <DialogTrigger
              render={<Button type='button' variant='outline' size='sm' disabled={!hydrated} />}
            >
              {record?.note ? 'Edit note' : 'Add note'}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review note · {label}</DialogTitle>
                <DialogDescription>
                  Preserve evidence or repair context. A note does not verify the route.
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-2'>
                <label htmlFor={`${id}-note`} className='text-sm font-medium'>
                  Human note
                </label>
                <Textarea
                  id={`${id}-note`}
                  value={noteDraft}
                  onChange={event => setNoteDraft(event.target.value)}
                  placeholder='What did you observe? What still needs repair?'
                  maxLength={PLAYGROUND_HITL_NOTE_MAX_LENGTH}
                  rows={5}
                />
              </div>
              <DialogFooter>
                <Button
                  type='button'
                  onClick={() => {
                    setReview(screenId, fingerprint, { note: noteDraft })
                    setNoteOpen(false)
                  }}
                >
                  Save note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {variant === 'card' || mark === 'obsolete' ? (
          <p className='text-muted-foreground text-xs text-pretty'>
            {markDescription(mark)}
          </p>
        ) : null}
      </div>
    </div>
  )
}

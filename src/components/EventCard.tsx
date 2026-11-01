
import { posterUrl } from '../lib'
import { Calendar, MapPin, ExternalLink } from 'lucide-react'

const formatTime = (time?: string | null) => {
  if (!time) return ''
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time.slice(0, 5)
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

export default function EventCard({ e }: { e: any }) {
  const img = posterUrl(e.poster_path)

  return (
    <article className="card flex flex-col overflow-hidden">
      {img ? (
        <img
          src={img}
          alt={`${e.title} poster`}
          loading="lazy"
          className="aspect-[3/4] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center bg-black/40 text-sm text-mute">
          Poster not uploaded yet
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs text-gold">
          {e.departments?.name} · {e.category}
        </p>

        <h3 className="text-xl font-semibold">{e.title}</h3>

        {e.tagline && <p className="text-sm italic text-mute">{e.tagline}</p>}

        <p className="flex items-center gap-1 text-xs text-mute">
          <Calendar size={13} />
          {e.event_date ?? 'Date TBA'} {formatTime(e.start_time)}
          {e.end_time && `–${formatTime(e.end_time)}`}
        </p>

        <p className="flex items-center gap-1 text-xs text-mute">
          <MapPin size={13} />
          {e.venue ?? 'Venue TBA'}
        </p>

        <details className="text-sm">
          <summary className="cursor-pointer text-gold">View Details</summary>
          <div className="mt-2 space-y-2 text-zinc-300">
            {e.description && <p>{e.description}</p>}
            {e.rules && (
              <>
                <p className="font-semibold text-white">Rules</p>
                <p className="whitespace-pre-line">{e.rules}</p>
              </>
            )}
            {e.entry_fee && <p>Entry fee: {e.entry_fee}</p>}
            {(e.contact_person || e.contact_phone) && (
              <p>
                <span>Contact:</span>
                {e.contact_person && <><br />{e.contact_person}</>}
                {e.contact_phone && <><br />{e.contact_phone}</>}
              </p>
            )}
          </div>
        </details>

        {e.form_url ? (
          <a
            className="btn mt-auto"
            href={e.form_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register Now <ExternalLink size={14} />
          </a>
        ) : (
          <span className="btn-o mt-auto border-red-500 text-red-500 opacity-100 cursor-not-allowed">
            Registration Closed
          </span>
        )}
      </div>
    </article>
  )
}

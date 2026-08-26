import {
  CalendarDays,
  MapPin,
} from 'lucide-react';

import { AnimatedBackground } from '../components/AnimatedBackground';
import { BottomNav } from '../components/BottomNav';

import type { User } from '../lib/auth';
import type { NavigationPage } from '../components/BottomNav';

interface EventsPageProps {
  user: User;
  onNavigate: (page: NavigationPage) => void;
}

const events = [
  {
    day: '29',
    month: 'AUG',
    title: 'SUMMER TAKEOFF',
    location: 'Orom',
    description:
      'A nyár egyik legnagyobb bulija, a legjobb DJ-kkel és egész estés programmal.',
  }
];

export function EventsPage({
  user,
  onNavigate,
}: EventsPageProps) {
  return (
    <main className="app-shell">
      <AnimatedBackground />

      <div className="app-container page-enter">
        <header className="topbar">
          <div>
            <p className="muted-label">
              SUMMER TAKEOFF
            </p>

            <h1 className="page-title">
              Események
            </h1>
          </div>

          <div className="avatar">
            <CalendarDays size={21} />
          </div>
        </header>

        <section className="events-page">
          <div className="events-intro">
            <span className="muted-label">
              KÖVETKEZŐ PROGRAMOK
            </span>

            <p>
              Találd meg a következő bulit.
            </p>
          </div>

          <div className="events-list">
            {events.map((event) => (
              <article
                className="event-card glass-card"
                key={`${event.day}-${event.month}-${event.title}`}
              >
                <div className="event-date">
                  <strong>{event.day}</strong>
                  <span>{event.month}</span>
                </div>

                <div className="event-content">
                  <h2>{event.title}</h2>

                  <div className="event-location">
                    <MapPin size={15} />
                    <span>
                      {event.location}
                    </span>
                  </div>

                  <p>
                    {event.description}
                  </p>

                  <button
                    className="secondary-button event-button"
                    type="button"
                  >
                    Részletek
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <BottomNav
        active="events"
        user={user}
        onNavigate={onNavigate}
      />
    </main>
  );
}
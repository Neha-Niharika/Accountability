// Summary card for the Week and Month views: done vs due, goal count and %.
// Pass `streak` ({ current, best }) to add a streak row.
import { CalendarIcon, CheckCircleIcon, ClockIcon, FlameIcon, InfoIcon, TargetIcon, TrendingUpIcon } from './Icons'

function daysLabel(count) {
  return `${count} day${count === 1 ? '' : 's'}`
}

function PeriodHero({ label, title, done, due, goalCount, percent, streak }) {
  const missed = due - done

  return (
    <section className="hero-card" aria-label={`${label} summary`}>
      <span className="hero-blob" aria-hidden="true" />
      <div className="hero-heading">
        <span className="hero-icon" aria-hidden="true">
          <TargetIcon size={30} />
        </span>
        <div>
          <p className="label">{label}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="bento-grid">
        <div className="bento">
          <span className="bento-icon" aria-hidden="true">
            <CheckCircleIcon size={16} />
          </span>
          <div>
            <p className="label">Done</p>
            <p className="bento-value">{done}</p>
          </div>
        </div>
        <div className="bento">
          <span className="bento-icon" aria-hidden="true">
            <ClockIcon size={16} />
          </span>
          <div>
            <p className="label">Missed or open</p>
            <p className="bento-value">{missed}</p>
          </div>
        </div>
        <div className="bento">
          <span className="bento-icon" aria-hidden="true">
            <CalendarIcon size={16} />
          </span>
          <div>
            <p className="label">Goals</p>
            <p className="bento-value">{goalCount}</p>
          </div>
        </div>
        <div className="bento">
          <span className="bento-icon" aria-hidden="true">
            <TrendingUpIcon size={16} />
          </span>
          <div>
            <p className="label">Completion</p>
            <p className="bento-value">{percent}%</p>
          </div>
        </div>
        {streak && (
          <div className="bento bento-wide">
            <span className="bento-icon" aria-hidden="true">
              <FlameIcon size={16} />
            </span>
            <div>
              <p className="label">Current streak</p>
              <p className="bento-value">{daysLabel(streak.current)}</p>
            </div>
            <div className="bento-aside">
              <p className="label">Best</p>
              <p className="bento-value">{daysLabel(streak.best)}</p>
            </div>
          </div>
        )}
      </div>

      <div
        className="progress-bar"
        role="progressbar"
        aria-label={`${label} completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>

      <p className="info-box">
        <InfoIcon size={20} />
        <span>
          {due === 0
            ? 'Nothing was due in this period yet.'
            : `${done} of ${due} check-ins done. Only days up to today count.`}
        </span>
      </p>
    </section>
  )
}

export default PeriodHero

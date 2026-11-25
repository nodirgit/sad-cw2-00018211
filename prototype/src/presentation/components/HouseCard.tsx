import { useState } from 'react';
import type { House } from '../../domain/farm/House';
import { BatchStatus } from '../../domain/farm/BatchStatus';
import { useUser } from '../AppContext';
import { num } from '../format';

/**
 * One house at a glance: batch day, birds, deaths (FR-01), live temperature and
 * humidity with alert (FR-07), light switch with confirmation (FR-08). No money (NFR-03).
 */
export function HouseCard({ house }: { house: House }) {
  const { c, refresh, go } = useUser();
  const [pending, setPending] = useState(false);
  const [lightWarning, setLightWarning] = useState<string | null>(null);

  const batch = house.currentBatch();
  const env = c.monitoring.check(house.getId());
  const reading = env.reading;

  async function toggleLight() {
    setPending(true);
    setLightWarning(null);
    try {
      const outcome = await c.lighting.switchLight(house.getId(), !house.isLightOn());
      if (outcome.status === 'UNCONFIRMED') {
        setLightWarning('No confirmation from the house — the connection dropped. The light may not have switched. Check it or try again.');
      }
    } finally {
      setPending(false);
      refresh();
    }
  }

  return (
    <section className={`card house ${env.abnormal ? 'alert' : ''}`} aria-label={house.getName()}>
      <div className="row">
        <span className="name">{house.getName()}</span>
        {batch ? (
          <span className={`chip ${batch.getStatus() === BatchStatus.SLAUGHTERING ? 'warn' : 'ok'}`}>
            Day {batch.ageInDays()} · {batch.getStatus() === BatchStatus.SLAUGHTERING ? 'slaughtering' : 'growing'}
          </span>
        ) : (
          <span className="chip grey">No open batch</span>
        )}
      </div>

      {batch && (
        <div className="stats">
          <div className="stat">
            <b>{num(batch.getChicksPlaced())}</b>
            <span>chicks placed</span>
          </div>
          <div className="stat">
            <b>{num(c.mortality.deathsToday(batch.getId()))}</b>
            <span>deaths today</span>
          </div>
          <div className="stat">
            <b>{num(c.mortality.totalDeaths(batch.getId()))}</b>
            <span>deaths in batch</span>
          </div>
        </div>
      )}

      <div className={`env ${env.abnormal ? 'alert' : ''}`}>
        <span className="reading">{reading.getTemperatureC().toFixed(1)} °C</span>
        <span className="reading">{reading.getHumidityPct()} %</span>
        {env.abnormal ? (
          <span className="chip err">⚠ {env.problems.join(' · ')}</span>
        ) : (
          <span className="chip ok">Normal</span>
        )}
        <span className="tiny muted" style={{ width: '100%' }}>
          Simulated sensor · range {env.range.getMinTempC()}–{env.range.getMaxTempC()} °C, {env.range.getMinHumidityPct()}–{env.range.getMaxHumidityPct()} %
        </span>
      </div>

      <div className="light">
        <span>
          <i className={`bulb ${house.isLightOn() ? 'on' : ''}`} />
          Lights <b>{house.isLightOn() ? 'ON' : 'OFF'}</b>
        </span>
        <button className="btn btn-secondary btn-small" onClick={toggleLight} disabled={pending}>
          {pending ? 'Switching…' : house.isLightOn() ? 'Turn off' : 'Turn on'}
        </button>
      </div>
      {lightWarning && (
        <div className="notice warn" style={{ marginTop: 10 }}>
          <strong>Not confirmed</strong>
          {lightWarning}
        </div>
      )}

      {batch && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btn-secondary btn-small" style={{ flex: 1 }} onClick={() => go({ name: 'death', houseId: house.getId() })}>
            + Death
          </button>
          <button className="btn btn-secondary btn-small" style={{ flex: 1 }} onClick={() => go({ name: 'feed', houseId: house.getId() })}>
            + Feed
          </button>
        </div>
      )}
    </section>
  );
}

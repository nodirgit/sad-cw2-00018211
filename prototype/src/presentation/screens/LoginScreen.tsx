import { useState } from 'react';
import { useApp } from '../AppContext';
import { useAction } from '../useAction';

/** NFR-03: enter your 4-digit PIN; the PIN says who you are. */
export function LoginScreen() {
  const { c, login } = useApp();
  const [pin, setPin] = useState('');
  const { error, run } = useAction();

  function press(digit: string) {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      const user = run(() => c.auth.login(next));
      if (user) login(user);
      else setPin('');
    }
  }

  return (
    <main className="content">
      <div className="hero">
        <h1>Parranda Farm</h1>
        <p>Nurota Halol Parranda MCHJ</p>
      </div>

      <div className="card">
        <div className="field" style={{ alignItems: 'center' }}>
          <label>Enter your PIN</label>
          <div className="pin-dots" aria-label={`${pin.length} of 4 digits`}>
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={i < pin.length ? 'f' : ''} />
            ))}
          </div>
        </div>
        {error && <div className="notice err" style={{ margin: '8px 0' }}>{error}</div>}
        <div className="keypad" style={{ marginTop: 10 }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button className="fn" onClick={() => setPin('')}>
            Clear
          </button>
          <button onClick={() => press('0')}>0</button>
          <button className="fn" onClick={() => setPin(pin.slice(0, -1))}>
            ⌫
          </button>
        </div>
      </div>
      <p className="tiny muted" style={{ textAlign: 'center' }}>
        Demo PINs: {c.demo.pins}
      </p>
    </main>
  );
}

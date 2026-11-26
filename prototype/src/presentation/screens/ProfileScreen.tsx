import { useUser } from '../AppContext';
import { MenuRow } from '../components/MenuRow';
import { Screen } from '../components/Screen';

/** Profile section: who is logged in, the Director's settings menu (NFR-05), and log out. */
export function ProfileScreen() {
  const { c, user, go, logout } = useUser();
  const director = c.policy.canSeeMoney(user);
  const houses = c.farm.houses();
  const suppliers = c.suppliers.activeSuppliers();

  return (
    <Screen title="Profile" subtitle={c.farm.farm().getName()}>
      <div className="card profile">
        <div className="avatar" aria-hidden>
          {user.getName().charAt(0)}
        </div>
        <div>
          <b>{user.getName()}</b>
          <div className="small muted">{user.roleName()}</div>
          <div className="tiny muted">
            {director ? 'Sees costs, sales and profit.' : 'Records deaths and feed. Costs, sales and profit are hidden (NFR-03).'}
          </div>
        </div>
      </div>

      {director && (
        <>
          <div className="section-title">Settings · farm</div>
          <div className="menu">
            <MenuRow icon="🏠" title="Houses" detail={`${houses.length} ${houses.length === 1 ? 'house' : 'houses'} · batches · normal ranges`} onClick={() => go({ name: 'settings-houses' })} />
            <MenuRow icon="🚚" title="Suppliers" detail={`${suppliers.length} chick and feed suppliers`} onClick={() => go({ name: 'settings-suppliers' })} />
          </div>
          <div className="section-title">Settings · app</div>
          <div className="menu">
            <MenuRow icon="🧪" title="Demo data" detail="What is invented · reset" onClick={() => go({ name: 'settings-demo' })} />
          </div>
        </>
      )}

      <button className="btn btn-danger" onClick={logout}>
        Log out
      </button>
      <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>
        Shared farm phone: log out so the next person logs in with their own PIN (NFR-03).
      </p>
    </Screen>
  );
}

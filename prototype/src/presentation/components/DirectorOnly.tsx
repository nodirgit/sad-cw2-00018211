import { Screen } from './Screen';

/** NFR-03: what a Worker sees if a money screen is opened under their login. */
export function DirectorOnly() {
  return (
    <Screen title="Director only">
      <div className="notice warn">
        <strong>This screen shows money.</strong>
        Costs, revenue and profit are visible only under the Director's login (NFR-03).
      </div>
    </Screen>
  );
}

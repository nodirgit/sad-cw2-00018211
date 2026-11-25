import { DomainError } from '../../domain/DomainError';
import { ExpenseCategory } from '../../domain/finance/Expense';
import { User } from '../../domain/people/User';
import { SessionKind, SlaughterSession } from '../../domain/slaughter/SlaughterSession';
import { newId } from '../ids';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';
import { BatchProfitService } from './BatchProfitService';
import { FarmService } from './FarmService';

/** FR-04 + NFR-04: the crew head count is written down and paid before the crew leaves. */
export class SlaughterService {
  private readonly sessions: Repository<SlaughterSession>;
  private readonly farm: FarmService;
  private readonly profit: BatchProfitService;
  private readonly policy: AccessPolicy;
  private readonly clock: () => Date;

  constructor(sessions: Repository<SlaughterSession>, farm: FarmService, profit: BatchProfitService, policy: AccessPolicy, clock: () => Date = () => new Date()) {
    this.sessions = sessions;
    this.farm = farm;
    this.profit = profit;
    this.policy = policy;
    this.clock = clock;
  }

  startSession(houseId: string, kind: SessionKind, user: User): SlaughterSession {
    this.policy.requireDirector(user);
    const batch = this.farm.openBatch(houseId);
    batch.startSlaughter();
    this.farm.save();
    const session = new SlaughterSession(newId('session'), batch.getId(), this.clock(), kind);
    this.sessions.save(session);
    return session;
  }

  session(sessionId: string): SlaughterSession {
    const s = this.sessions.findById(sessionId);
    if (!s) throw new DomainError('Session not found.');
    return s;
  }

  sessionsForBatch(batchId: string): SlaughterSession[] {
    return this.sessions
      .findAll()
      .filter((s) => s.getBatchId() === batchId)
      .sort((a, b) => b.getDate().getTime() - a.getDate().getTime());
  }

  allSessions(): SlaughterSession[] {
    return this.sessions.findAll().sort((a, b) => b.getDate().getTime() - a.getDate().getTime());
  }

  /** NFR-04: returns the crew payment in the same call, so it shows on the same screen visit. */
  recordHeadCount(sessionId: string, count: number, ratePerHead: number, user: User): number {
    this.policy.requireDirector(user);
    const session = this.session(sessionId);
    const record = session.recordHeadCount(count, ratePerHead, this.clock());
    this.sessions.save(session);
    this.bookCrewPay(session, user);
    return record.crewPayment();
  }

  /** FR-04 edge case: a recount is a correction with a note; the original stays in the history. */
  correctHeadCount(sessionId: string, newCount: number, note: string, user: User): number {
    this.policy.requireDirector(user);
    const session = this.session(sessionId);
    const record = session.correctHeadCount(newCount, note, this.clock());
    this.sessions.save(session);
    this.bookCrewPay(session, user);
    return record.crewPayment();
  }

  /** FR-03: the crew's pay is a CREW expense of this batch; same id, so a correction replaces it. */
  private bookCrewPay(session: SlaughterSession, user: User): void {
    const hc = session.getHeadCount();
    if (!hc) return;
    this.profit.recordExpenseForBatch(
      session.getBatchId(),
      ExpenseCategory.CREW,
      hc.crewPayment(),
      `${hc.effectiveCount().toLocaleString('en-US')} head × ${hc.getRatePerHead().toLocaleString('en-US')}`,
      session.getDate(),
      user,
      `exp-crew-${session.getId()}`,
    );
  }
}

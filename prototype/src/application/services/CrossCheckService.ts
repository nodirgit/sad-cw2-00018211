import { DomainError } from '../../domain/DomainError';
import { Buyer } from '../../domain/partners/Buyer';
import { Sale } from '../../domain/finance/Sale';
import { User } from '../../domain/people/User';
import { SlaughterSession } from '../../domain/slaughter/SlaughterSession';
import { CrossCheckStatus } from '../../domain/slaughter/WeightTally';
import { Repository } from '../ports/Repository';
import { AccessPolicy } from './AccessPolicy';
import { BatchProfitService } from './BatchProfitService';

/** FR-05: compare the Bazaar Agent's kg total with the Trusted Representative's tally. */
export class CrossCheckService {
  private readonly sessions: Repository<SlaughterSession>;
  private readonly profit: BatchProfitService;
  private readonly policy: AccessPolicy;

  constructor(sessions: Repository<SlaughterSession>, profit: BatchProfitService, policy: AccessPolicy) {
    this.sessions = sessions;
    this.profit = profit;
    this.policy = policy;
  }

  /** The figure from the agent's Telegram photo. */
  enterAgentKg(sessionId: string, kg: number, user: User): CrossCheckStatus {
    this.policy.requireDirector(user);
    const session = this.unsold(sessionId);
    session.getTally().enterAgentKg(kg);
    this.sessions.save(session);
    return session.getTally().status();
  }

  /** The figure the Trusted Representative wrote down at the same weighings. */
  enterRepresentativeKg(sessionId: string, kg: number, user: User): CrossCheckStatus {
    this.policy.requireDirector(user);
    const session = this.unsold(sessionId);
    session.getTally().enterRepresentativeKg(kg);
    this.sessions.save(session);
    return session.getTally().status();
  }

  status(sessionId: string): CrossCheckStatus {
    return this.session(sessionId).getTally().status();
  }

  /**
   * FR-05 edge case: refuses while PENDING (one unconfirmed total) or MISMATCH,
   * so no payment is ever calculated from a single figure.
   */
  recordSale(sessionId: string, buyer: Buyer, pricePerKg: number, user: User): Sale {
    this.policy.requireDirector(user);
    const session = this.session(sessionId);
    const tally = session.getTally();
    if (buyer.requiresCrossCheck()) {
      const status = tally.status();
      if (status === CrossCheckStatus.PENDING) throw new DomainError('Waiting for the second figure. No sale from one unconfirmed total.');
      if (status === CrossCheckStatus.MISMATCH) throw new DomainError(`The figures differ by ${Math.abs(tally.difference() ?? 0).toLocaleString('en-US')} kg. Resolve it before recording the sale.`);
    }
    const sale = this.profit.recordSaleForBatch(session.getBatchId(), buyer, tally.confirmedKg(), pricePerKg, new Date(), user);
    session.markSold(sale.getId());
    this.sessions.save(session);
    return sale;
  }

  /** Undo a sale recorded by mistake: the Sale entry goes, the weights stay and can be corrected. */
  undoSale(sessionId: string, user: User): void {
    this.policy.requireDirector(user);
    const session = this.session(sessionId);
    const saleId = session.getSaleId();
    if (!saleId) throw new DomainError('No sale is recorded for this session.');
    this.profit.removeLinkedEntry(saleId, user);
    session.clearSale();
    this.sessions.save(session);
  }

  private unsold(sessionId: string): SlaughterSession {
    const session = this.session(sessionId);
    if (session.isSold()) throw new DomainError('The sale is recorded. Undo the sale to change the weights.');
    return session;
  }

  private session(sessionId: string): SlaughterSession {
    const s = this.sessions.findById(sessionId);
    if (!s) throw new DomainError('Session not found.');
    return s;
  }
}

import { DomainError } from '../DomainError';

/**
 * A partner's tax and contact details (value object). Every field is optional; what is given is checked:
 * the TIN (Uzbek STIR) is 9 digits, a phone number has at least 7 digits.
 */
export class PartnerDetails {
  readonly tin: string;
  readonly contactPerson: string;
  readonly phone: string;
  readonly address: string;

  constructor(tin = '', contactPerson = '', phone = '', address = '') {
    const t = tin.replace(/\s/g, '');
    if (t && !/^\d{9}$/.test(t)) throw new DomainError('The TIN must be 9 digits.');
    const p = phone.trim();
    if (p && (!/^[+\d\s()-]+$/.test(p) || p.replace(/\D/g, '').length < 7)) throw new DomainError('Enter the phone number with at least 7 digits, e.g. +998 90 123 45 67.');
    this.tin = t;
    this.contactPerson = contactPerson.trim();
    this.phone = p;
    this.address = address.trim();
  }

  static empty(): PartnerDetails {
    return new PartnerDetails();
  }

  isEmpty(): boolean {
    return !this.tin && !this.contactPerson && !this.phone && !this.address;
  }
}

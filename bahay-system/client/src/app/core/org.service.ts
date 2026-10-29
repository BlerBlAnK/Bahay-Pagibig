import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { OrganizationInfo } from './models';

/**
 * The editable About Us content, fetched once and shared by the header,
 * footer, home page and About page. Falls back to the facility's own details
 * so the portal still reads correctly if the API is unreachable.
 */
@Injectable({ providedIn: 'root' })
export class OrgService {
  private api = inject(ApiService);
  private loaded = false;

  private _info = signal<OrganizationInfo>({
    name: 'Bahay Pag-ibig',
    tagline: 'A home where every resident is cared for',
    about: '',
    mission: '',
    vision: '',
    history: '',
    address: 'San Fernando, Pampanga',
    contact_number: '0942-979-7756 (Viber)',
    email: 'bahaypagibig1988@gmail.com',
    visiting_hours: 'Monday to Sunday, 8:00 AM to 5:00 PM',
    facts: [],
  });

  readonly info = this._info.asReadonly();

  /** Safe to call from every component that needs it; only the first call fetches. */
  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.api.publicOrganization().subscribe({
      next: info => this._info.set({ ...this._info(), ...info }),
      error: () => { this.loaded = false; },   // let a later screen try again
    });
  }
}

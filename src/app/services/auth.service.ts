import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User, AuthState } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private state$ = new BehaviorSubject<AuthState>({ user: null, token: null, loggedIn: false });
  auth$ = this.state$.asObservable();
  get snapshot(): AuthState { return this.state$.getValue(); }
  setAuth(user: User, token: string) { this.state$.next({ user, token, loggedIn: true }); }
  clearAuth() { this.state$.next({ user: null, token: null, loggedIn: false }); }
  get token(): string | null { return this.snapshot.token; }
  get user(): User | null { return this.snapshot.user; }
  get isATC(): boolean { return this.snapshot.user?.type === 'ATC'; }
  get isPassenger(): boolean { return this.snapshot.user?.type === 'Passenger'; }
}

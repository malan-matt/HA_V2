import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DEFAULT_WS_PORT, setWebSocketPort } from '../../config';
import { isWheatleyConfigured } from '../../environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  wsPort = DEFAULT_WS_PORT;
  loading = false;
  errorMessage = '';
  private subs: Subscription[] = [];

  constructor(private api: ApiService, private auth: AuthService, private ws: WebSocketService, private router: Router) {}

  ngOnInit(): void {
    if (!isWheatleyConfigured()) {
      this.errorMessage =
        'Wheatley credentials missing. Edit src/app/environment.local.ts (wheatleyUser / wheatleyPass).';
    }
    if (this.auth.snapshot.loggedIn) this.redirectByRole();
  }

  onSubmit(): void {
    if (!this.username.trim() || !this.password.trim()) { this.errorMessage = 'Please enter both username and password.'; return; }
    this.loading = true;
    this.errorMessage = '';
    this.subs.push(this.api.login(this.username, this.password).subscribe({ next: ({ token, user }) => {
      // Validate user type is set
      if (!user?.type) {
        this.errorMessage = 'Invalid user type returned from server';
        this.loading = false;
        return;
      }
      this.auth.setAuth(user, token);
      setWebSocketPort(this.wsPort);
      this.ws.connect(this.wsPort);
      this.ws.authenticateWithToken(user.username, token, user.type);
      this.loading = false;
      this.redirectByRole();
    }, error: (err) => {
      if (err.status === 401 && !isWheatleyConfigured()) {
        this.errorMessage =
          '401 Unauthorized — set Wheatley hosting credentials in environment.local.ts first.';
      } else if (err.status === 401 && err?.error?.error) {
        this.errorMessage =
          'Flight-app login rejected: ' +
          err.error.error +
          ' — run seed-update-passwords.sql on Wheatley (or install-test-passwords.php once).';
      } else if (err.status === 401) {
        this.errorMessage =
          '401 from Wheatley web server (HTML) — check wheatleyUser/wheatleyPass in environment.local.ts.';
      } else if (err.status === 0) {
        this.errorMessage = 'Cannot reach API — check Wheatley credentials and network.';
      } else {
        this.errorMessage = err?.error?.error || `Login failed (${err.status || 'unknown'}).`;
      }
      this.loading = false;
    } }));
  }

  private redirectByRole(): void {
    if (this.auth.isATC) this.router.navigate(['/atc']); else this.router.navigate(['/passenger']);
  }

  ngOnDestroy(): void { this.subs.forEach((s) => s.unsubscribe()); }
}

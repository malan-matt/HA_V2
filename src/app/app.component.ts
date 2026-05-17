import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WebSocketService } from './services/websocket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div class="app-shell">
      <div class="connection-banner" *ngIf="!connected" role="alert">
        <span class="banner-icon">⚠</span>
        <span>WebSocket disconnected — interactions disabled until reconnected.</span>
        <button class="reconnect-btn" (click)="reconnect()">Reconnect</button>
      </div>
      <router-outlet />
    </div>
  `,
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  connected = false;

  constructor(private ws: WebSocketService) {}

  ngOnInit(): void {
    this.ws.connected$.subscribe((state: boolean) => {
      this.connected = state;
    });
    this.ws.onMessage().subscribe((message) => {
      if (message.type === 'SHUTDOWN' || message.type === 'SERVER_SHUTDOWN') {
        this.connected = false;
      }
    });
  }

  reconnect(): void {
    this.ws.reconnect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }
}

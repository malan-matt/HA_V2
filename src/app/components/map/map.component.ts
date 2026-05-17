import {
  Component,
  AfterViewInit,
  OnDestroy,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MapService } from '../../services/map.service';
import { ApiService } from '../../services/api.service';
import { WebSocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper">
      <div id="flight-map" class="map-container"></div>
      <div class="map-overlay" *ngIf="flightIdToTrack !== null && trackingLabel">
        <div class="tracking-label">{{ trackingLabel }}</div>
        <div class="progress-bar" *ngIf="progressPercent !== null">
          <div class="progress-fill" [style.width.%]="progressPercent"></div>
          <span class="progress-text">{{ progressPercent | number: '1.0-0' }}%</span>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() flightIdToTrack: number | null = null;
  @Input() flightNumber: string | null = null;

  trackingLabel: string | null = null;
  progressPercent: number | null = null;

  private subs: Subscription[] = [];

  constructor(
    private mapService: MapService,
    private api: ApiService,
    private ws: WebSocketService,
    private auth: AuthService
  ) {}

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  private async initializeMap(): Promise<void> {
    await this.mapService.initMap('flight-map');

    const token = this.auth.token;
    this.subs.push(
      this.api.getAirports(token).subscribe({
        next: async (airports) => this.mapService.plotAirports(airports),
      })
    );

    this.subs.push(
      this.ws.onMessage().subscribe(async (message) => {
        if (message.type !== 'POSITION') return;

        await this.mapService.updateAircraftPosition(message);

        if (this.flightIdToTrack !== null && message.flight_id === this.flightIdToTrack) {
          if (message.flight_number) {
            this.trackingLabel = message.flight_number;
          }
          if (message.progress != null) {
            this.progressPercent = Math.min(100, Math.round(message.progress * 100));
          }
          this.mapService.panToFlight(message.flight_id);
        }
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['flightIdToTrack'] || changes['flightNumber']) {
      if (this.flightIdToTrack !== null) {
        this.trackingLabel = this.flightNumber ?? `Flight ${this.flightIdToTrack}`;
        this.mapService.panToFlight(this.flightIdToTrack);
      } else {
        this.trackingLabel = null;
        this.progressPercent = null;
      }
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.mapService.destroyMap();
  }
}

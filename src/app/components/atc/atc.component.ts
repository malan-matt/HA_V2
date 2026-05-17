import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../map/map.component';
import { ApiService, PassengerBooking } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-atc',
  standalone: true,
  imports: [CommonModule, FormsModule, MapComponent],
  templateUrl: './atc.component.html',
  styleUrls: ['./atc.component.scss'],
})
export class AtcComponent implements OnInit, OnDestroy {
  flights: any[] = [];
  selectedFlight: any = null;
  passengers: PassengerBooking[] = [];
  trackedFlightId: number | null = null;
  trackedFlightNumber: string | null = null;
  errorMessage = '';
  infoMessage = '';
  loading = true;
  dispatching = false;
  loadingPassengers = false;
  boardingConfirmations: any[] = [];
  activeFilter: 'All' | 'Scheduled' | 'Active' = 'All';

  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private ws: WebSocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFlights();
    this.listenForWebSocketMessages();
  }

  loadFlights(): void {
    this.loading = true;
    this.api.getAllFlights(this.auth.token).subscribe({
      next: (flights) => {
        this.flights = flights;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load flights';
        this.loading = false;
      },
    });
  }

  listenForWebSocketMessages(): void {
    this.subs.push(
      this.ws.onMessage().subscribe((message) => {
        switch (message.type) {
          case 'DISPATCH_SUCCESS':
            this.handleDispatchSuccess(message);
            break;
          case 'BOARDING_CONFIRMATION':
            this.handleBoardingConfirmation(message);
            break;
          case 'NO_SHOW':
            this.handleNoShow(message);
            break;
          case 'ERROR':
            this.handleError(message);
            break;
          case 'POSITION':
          case 'STATUS_CHANGE':
            this.updateFlightFromMessage(message);
            break;
          case 'SHUTDOWN':
          case 'SERVER_SHUTDOWN':
            this.infoMessage = message.message || 'Server is shutting down';
            break;
        }
      })
    );
  }

  handleDispatchSuccess(message: any): void {
    this.dispatching = false;
    this.infoMessage = message.message || `Flight ${message.flight_number ?? message.flight_id} dispatched`;
    setTimeout(() => (this.infoMessage = ''), 4000);
    this.loadFlights();
    if (this.selectedFlight?.id === message.flight_id) {
      this.loadPassengers(message.flight_id);
    }
  }

  handleBoardingConfirmation(message: any): void {
    this.boardingConfirmations.unshift({
      flightId: message.flight_id,
      passenger: message.passenger,
      message: message.message,
      time: new Date(),
    });
    if (this.boardingConfirmations.length > 10) {
      this.boardingConfirmations.pop();
    }
    if (this.selectedFlight?.id === message.flight_id) {
      this.loadPassengers(message.flight_id);
    }
  }

  handleNoShow(message: any): void {
    this.boardingConfirmations.unshift({
      flightId: message.flight_id,
      passenger: message.passenger,
      message: message.message,
      time: new Date(),
      isNoShow: true,
    });
    this.errorMessage = message.message;
    setTimeout(() => (this.errorMessage = ''), 6000);
    if (this.selectedFlight?.id === message.flight_id) {
      this.loadPassengers(message.flight_id);
    }
  }

  handleError(message: any): void {
    this.dispatching = false;
    this.errorMessage = message.message;
    setTimeout(() => (this.errorMessage = ''), 5000);
  }

  selectFlight(flight: any): void {
    this.selectedFlight = flight;
    this.loadPassengers(flight.id);
  }

  loadPassengers(flightId: number): void {
    this.loadingPassengers = true;
    this.api.getFlightPassengers(this.auth.token, flightId).subscribe({
      next: (passengers) => {
        this.passengers = passengers;
        this.loadingPassengers = false;
      },
      error: () => {
        this.passengers = [];
        this.loadingPassengers = false;
      },
    });
  }

  dispatchFlight(): void {
    if (this.selectedFlight?.status === 'Scheduled') {
      this.dispatching = true;
      this.ws.dispatchFlight(this.selectedFlight.id);
    } else {
      this.errorMessage = 'Only scheduled flights can be dispatched';
      setTimeout(() => (this.errorMessage = ''), 3000);
    }
  }

  trackFlight(): void {
    if (this.selectedFlight) {
      this.trackedFlightId = this.selectedFlight.id;
      this.trackedFlightNumber = this.selectedFlight.flight_number;
      this.ws.trackFlight(this.selectedFlight.id);
      this.infoMessage = `Tracking ${this.selectedFlight.flight_number}`;
      setTimeout(() => (this.infoMessage = ''), 3000);
    }
  }

  getFlightStatusClass(status: string): string {
    switch (status) {
      case 'Scheduled':
        return 'status-scheduled';
      case 'Boarding':
        return 'status-boarding';
      case 'In Flight':
        return 'status-inflight';
      case 'Landed':
        return 'status-landed';
      default:
        return '';
    }
  }

  canDispatch(flight: any): boolean {
    return flight.status === 'Scheduled';
  }

  setFilter(filter: 'All' | 'Scheduled' | 'Active'): void {
    this.activeFilter = filter;
  }

  get filteredFlights(): any[] {
    switch (this.activeFilter) {
      case 'Scheduled':
        return this.flights.filter((f) => f.status === 'Scheduled');
      case 'Active':
        return this.flights.filter((f) => f.status === 'Boarding' || f.status === 'In Flight');
      default:
        return this.flights;
    }
  }

  private updateFlightFromMessage(message: any): void {
    const flight = this.flights.find((f) => f.id === message.flight_id);
    if (!flight) return;
    if (message.status) flight.status = message.status;
    if (message.latitude != null) flight.current_latitude = message.latitude;
    if (message.longitude != null) flight.current_longitude = message.longitude;
    if (this.selectedFlight?.id === flight.id) {
      this.selectedFlight = { ...flight };
    }
  }

  logout(): void {
    this.ws.disconnect();
    this.auth.clearAuth();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}

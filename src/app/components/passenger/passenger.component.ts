import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../map/map.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-passenger',
  standalone: true,
  imports: [CommonModule, FormsModule, MapComponent],
  templateUrl: './passenger.component.html',
  styleUrls: ['./passenger.component.scss']
})
export class PassengerComponent implements OnInit, OnDestroy {
  flights: any[] = [];
  selectedFlight: any = null;
  trackedFlightId: number | null = null;
  trackedFlightNumber: string | null = null;
  boardingCall: any = null;
  boardingCountdown: number = 60;
  boardingTimer: any = null;
  boardingConfirmed: boolean = false;
  errorMessage: string = '';
  infoMessage: string = '';
  loading: boolean = true;
  showBoardingModal: boolean = false;
  
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
      error: (error) => {
        this.errorMessage = 'Failed to load flights';
        this.loading = false;
      }
    });
  }
  
  listenForWebSocketMessages(): void {
    this.subs.push(
      this.ws.onMessage().subscribe((message) => {
        switch (message.type) {
          case 'BOARDING_CALL':
            this.handleBoardingCall(message);
            break;
          case 'STATUS_CHANGE':
            this.updateFlightFromMessage(message);
            break;
          case 'SHUTDOWN':
          case 'SERVER_SHUTDOWN':
            this.infoMessage = message.message || 'Server is shutting down';
            break;
          case 'BOARD_SUCCESS':
            this.handleBoardSuccess(message);
            break;
          case 'ERROR':
            this.handleError(message);
            break;
          case 'ATC_DISCONNECTED':
            this.infoMessage = 'ATC connection lost, but your flight continues normally';
            setTimeout(() => this.infoMessage = '', 5000);
            break;
          case 'POSITION':
            this.updateFlightFromMessage(message);
            break;
        }
      })
    );
  }
  
  handleBoardingCall(message: any): void {
    this.boardingCall = message;
    this.showBoardingModal = true;
    this.boardingConfirmed = false;
    this.boardingCountdown = 60;

    if (this.boardingTimer) clearInterval(this.boardingTimer);
    this.boardingTimer = setInterval(() => {
      if (this.boardingCountdown > 0 && !this.boardingConfirmed) {
        this.boardingCountdown--;
      } else if (this.boardingCountdown === 0 && !this.boardingConfirmed) {
        clearInterval(this.boardingTimer);
        this.showBoardingModal = false;
        this.errorMessage = 'Boarding window expired. You are marked as no-show.';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    }, 1000);
  }
  
  handleBoardSuccess(message: any): void {
    this.boardingConfirmed = true;
    clearInterval(this.boardingTimer);
    this.infoMessage = message.message;
    setTimeout(() => {
      this.infoMessage = '';
      this.showBoardingModal = false;
    }, 3000);
  }
  
  handleError(message: any): void {
    this.errorMessage = message.message;
    setTimeout(() => this.errorMessage = '', 5000);
  }
  
  selectFlight(flight: any): void {
    this.selectedFlight = flight;
  }
  
  trackFlight(): void {
    if (this.selectedFlight) {
      this.trackedFlightId = this.selectedFlight.id;
      this.trackedFlightNumber = this.selectedFlight.flight_number;
      this.ws.trackFlight(this.selectedFlight.id);
      this.infoMessage = `Tracking flight ${this.selectedFlight.flight_number}`;
      setTimeout(() => this.infoMessage = '', 3000);
    }
  }
  
  confirmBoarding(): void {
    if (this.boardingCall) {
      this.ws.boardFlight(this.boardingCall.flight_id);
    }
  }
  
  closeBoardingModal(): void {
    this.showBoardingModal = false;
    if (this.boardingTimer) clearInterval(this.boardingTimer);
  }
  
  private updateFlightFromMessage(message: any): void {
    const flight = this.flights.find((f) => f.id === message.flight_id);
    if (!flight) return;
    if (message.status) {
      flight.status = message.status;
    }
    if (message.latitude != null) {
      flight.current_latitude = message.latitude;
    }
    if (message.longitude != null) {
      flight.current_longitude = message.longitude;
    }
    if (this.selectedFlight?.id === flight.id) {
      this.selectedFlight = { ...flight };
    }
  }

  logout(): void {
    this.ws.disconnect();
    this.auth.clearAuth();
    this.router.navigate(['/login']);
  }
  
  getFlightStatusClass(status: string): string {
    switch (status) {
      case 'Scheduled': return 'status-scheduled';
      case 'Boarding': return 'status-boarding';
      case 'In Flight': return 'status-inflight';
      case 'Landed': return 'status-landed';
      default: return '';
    }
  }
  
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.boardingTimer) clearInterval(this.boardingTimer);
  }
}
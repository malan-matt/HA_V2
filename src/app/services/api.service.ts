import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../environment';
import { Airport, Flight, FlightDetail, User } from '../models';

interface ApiFlightsResponse {
  success: boolean;
  flights: Flight[];
}

interface ApiFlightResponse {
  success: boolean;
  flight: FlightDetail;
}

interface ApiAirportsResponse {
  success: boolean;
  airports: Airport[];
}

interface ApiPassengersResponse {
  success: boolean;
  passengers: PassengerBooking[];
}

export interface PassengerBooking {
  id: number;
  username: string;
  seat_number?: string;
  boarding_confirmed: boolean;
  confirmed_at?: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  private authHeaders(token: string | null): HttpHeaders {
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('X-App-Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  login(username: string, password: string): Observable<{ token: string; user: User }> {
    return this.http.post<LoginResponse>(`${API_BASE_URL}/login.php`, { username, password }).pipe(
      map((res) => ({ token: res.token, user: res.user }))
    );
  }

  getAirports(token: string | null): Observable<Airport[]> {
    return this.http
      .get<ApiAirportsResponse>(`${API_BASE_URL}/getAirports.php`, { headers: this.authHeaders(token) })
      .pipe(map((res) => res.airports));
  }

  getAllFlights(token: string | null): Observable<Flight[]> {
    return this.http
      .get<ApiFlightsResponse>(`${API_BASE_URL}/getAllFlights.php`, { headers: this.authHeaders(token) })
      .pipe(map((res) => res.flights));
  }

  getFlight(token: string | null, flightId: number): Observable<FlightDetail> {
    return this.http
      .get<ApiFlightResponse>(`${API_BASE_URL}/getFlights.php?id=${flightId}`, {
        headers: this.authHeaders(token),
      })
      .pipe(map((res) => res.flight));
  }

  getFlightPassengers(token: string | null, flightId: number): Observable<PassengerBooking[]> {
    return this.http
      .get<ApiPassengersResponse>(`${API_BASE_URL}/getFlightPassengers.php?id=${flightId}`, {
        headers: this.authHeaders(token),
      })
      .pipe(map((res) => res.passengers));
  }
}

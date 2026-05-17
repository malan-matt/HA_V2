export interface User { id: number; username: string; type: 'Passenger' | 'ATC' }

export interface AuthState { user: User | null; token: string | null; loggedIn: boolean }

export interface Airport { id: number; code: string; city: string; lat: number; lon: number }

export type FlightStatus = 'Scheduled' | 'Boarding' | 'In Flight' | 'Landed';

export interface Flight { id: number; flight_number: string; origin?: Airport; destination?: Airport; status: FlightStatus }

export interface FlightDetail extends Flight { passengers?: any[] }

// WebSocket message shapes (minimal)
export interface WsBoardingCallMessage { flight_id: number; flight_number: string }
export interface WsPositionMessage {
  flight_id: number;
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  progress?: number;
  status?: string;
  bearing?: number;
}

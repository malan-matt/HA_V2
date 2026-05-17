/**
 * Student Name: [Your Name]
 * Student Number: [Your Number]
 * Course: COS 216
 * Assignment: Homework Assignment - Flight Tracking System
 * Task 3: WebSocket Service
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { getWebSocketPort } from '../config';

interface PendingAuth {
  username: string;
  token: string;
  userType: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private socket: WebSocket | null = null;
  private connectedSubject = new BehaviorSubject<boolean>(false);
  private messageSubject = new Subject<any>();
  private messageQueue: unknown[] = [];
  private pendingAuth: PendingAuth | null = null;
  private currentPort = getWebSocketPort();

  connected$ = this.connectedSubject.asObservable();

  connect(port?: number): void {
    if (port !== undefined) {
      this.currentPort = port;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.socket = new WebSocket(`ws://localhost:${this.currentPort}`);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.connectedSubject.next(true);
      this.flushQueue();
      if (this.pendingAuth) {
        this.send({
          type: 'AUTHENTICATE',
          username: this.pendingAuth.username,
          token: this.pendingAuth.token,
          userType: this.pendingAuth.userType,
        });
        this.pendingAuth = null;
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageSubject.next(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectedSubject.next(false);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.connectedSubject.next(false);
      this.socket = null;
    };
  }

  send(message: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  authenticateWithToken(username: string, token: string, userType: string): void {
    const payload = { type: 'AUTHENTICATE', username, token, userType };
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send(payload);
    } else {
      this.pendingAuth = { username, token, userType };
    }
  }

  dispatchFlight(flightId: number): void {
    this.send({ type: 'DISPATCH', flight_id: flightId });
  }

  boardFlight(flightId: number): void {
    this.send({ type: 'BOARD', flight_id: flightId });
  }

  trackFlight(flightId: number): void {
    this.send({ type: 'TRACK', flight_id: flightId });
  }

  onMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  disconnect(): void {
    this.messageQueue = [];
    this.pendingAuth = null;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connectedSubject.next(false);
  }

  reconnect(): void {
    const port = this.currentPort;
    this.disconnect();
    setTimeout(() => this.connect(port), 1000);
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message !== undefined) {
        this.socket.send(JSON.stringify(message));
      }
    }
  }
}

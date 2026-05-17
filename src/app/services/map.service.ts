import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class MapService {
  private map: any = null;
  private aircraftMarkers = new Map<number, any>();
  private leafletModule: typeof import('leaflet') | null = null;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private async loadLeaflet(): Promise<typeof import('leaflet') | null> {
    if (!this.isBrowser) {
      return null;
    }
    if (this.leafletModule) {
      return this.leafletModule;
    }
    const module = await import('leaflet');
    this.leafletModule = module;
    return module;
  }

  async initMap(containerId: string): Promise<void> {
    if (!this.isBrowser || this.map) {
      return;
    }

    const L = await this.loadLeaflet();
    if (!L) {
      return;
    }

    this.map = L.map(containerId, { center: [-30.0, 25.0], zoom: 5 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);
  }

  async plotAirports(airports: any[]): Promise<void> {
    if (!this.isBrowser || !this.map) {
      return;
    }

    const L = await this.loadLeaflet();
    if (!L) {
      return;
    }

    airports.forEach((a) => {
      const marker = L.circleMarker([a.lat, a.lon], {
        radius: 7,
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 1,
        weight: 2,
      }).addTo(this.map);
      marker.bindPopup(`${a.code} — ${a.city}`);
    });
  }

  async updateAircraftPosition(msg: any): Promise<void> {
    if (!this.isBrowser || !this.map) {
      return;
    }

    const L = await this.loadLeaflet();
    if (!L) {
      return;
    }

    const id = msg.flight_id ?? 0;
    const lat = msg.lat ?? msg.latitude ?? -30;
    const lon = msg.lon ?? msg.longitude ?? 25;

    let marker = this.aircraftMarkers.get(id);
    if (!marker) {
      marker = L.marker([lat, lon], {
        icon: L.divIcon({ className: 'aircraft-marker-icon', html: '✈' }),
      }).addTo(this.map);
      const label = msg.flight_number ? `Flight ${msg.flight_number}` : `Flight ${id}`;
      marker.bindPopup(label);
      this.aircraftMarkers.set(id, marker);
    } else {
      marker.setLatLng([lat, lon]);
    }
  }

  panToFlight(flightId: number): void {
    const marker = this.aircraftMarkers.get(flightId);
    if (marker && this.map) {
      this.map.panTo(marker.getLatLng());
    }
  }

  destroyMap(): void {
    if (!this.isBrowser || !this.map) {
      return;
    }

    this.map.remove();
    this.map = null;
  }
}

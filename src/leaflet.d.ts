declare module 'leaflet' {
  export interface LatLngLiteral {
    lat: number;
    lon: number;
  }

  export interface Map {
    panTo(latlng: LatLngLiteral | [number, number]): void;
    remove(): void;
  }

  export interface Layer {
    addTo(map: Map): this;
  }

  export interface Marker extends Layer {
    bindPopup(html: string): this;
    setLatLng(latlng: LatLngLiteral | [number, number]): this;
    getLatLng(): LatLngLiteral;
  }

  export interface CircleMarker extends Layer {
    bindPopup(html: string): this;
  }

  export interface TileLayerOptions {
    attribution?: string;
  }

  export interface CircleMarkerOptions {
    radius?: number;
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
  }

  export interface MarkerOptions {
    icon?: DivIcon;
  }

  export interface DivIconOptions {
    className?: string;
    html?: string;
  }

  export interface DivIcon {}

  export function map(containerId: string, options?: any): Map;
  export function tileLayer(url: string, options?: TileLayerOptions): Layer;
  export function marker(latlng: LatLngLiteral | [number, number], options?: MarkerOptions): Marker;
  export function circleMarker(latlng: LatLngLiteral | [number, number], options?: CircleMarkerOptions): CircleMarker;
  export function divIcon(options: DivIconOptions): DivIcon;
}

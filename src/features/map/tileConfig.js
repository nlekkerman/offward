export const MAP_TILE_LAYERS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    minZoom: 0,
    maxNativeZoom: 19,
    maxZoom: 19,
  },
  terrain: {
    id: 'terrain',
    name: 'Terrain',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    minZoom: 0,
    maxNativeZoom: 17,
    maxZoom: 19,
  },
}

export const MAP_TILE_LAYER = MAP_TILE_LAYERS.standard

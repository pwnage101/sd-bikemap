var cloneDeep = require('lodash.clonedeep'),
    togeojson = require('@mapbox/togeojson');

// Create the overall map element
mapboxgl.accessToken = 'pk.eyJ1Ijoic2Fua2V5dG0iLCJhIjoiY2t6NW9uZjJtMHNodDJ2cDRtdWVjZmxpeSJ9.m6UectzjMjF_vZo2SquLeQ';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    // center and zoom into San Diego
    center: [-117.1517, 32.7552],
    zoom: 11,
});

// Disable map rotation using touch rotation gesture.  I have found that while using this app on
// a phone, it is way too prone to accidental rotation.
map.touchZoomRotate.disableRotation();

class BaseOverlay {
    id;
    name;
    dataURLs;
    dataType;
    defaultVisibility;
    addedLayerIDs;
    datas;

    constructor(id, name, dataURLs, attribution = undefined, defaultVisibility = 'visible', dataType = 'geojson') {
        this.id = id;
        this.name = name;
        this.dataURLs = dataURLs;
        this.dataType = dataType;
        this.attribution = attribution;
        this.defaultVisibility = defaultVisibility;
        this.addedLayerIDs = [];
    }
    isReady() {
        return this.addedLayerIDs.length > 0;
    }
    getLegendIcon() {
        return undefined;
    }
    run() {
        var self = this;
        if (self.dataType === 'geojson') {
            var dataURLFetches = self.dataURLs.map((dataURL) => $.getJSON(dataURL));
        } else if (self.dataType === 'kml') {
            var dataURLFetches = self.dataURLs.map((dataURL) => $.ajax({url: dataURL, dataType: 'xml'}));
        }
        $.when(...dataURLFetches).done(function(...results) {
            if (self.dataURLs.length > 1) {
                self.datas = results.map((r) => r[0]);
            } else {
                self.datas = [results[0]];
            }
            if (self.dataType === 'kml') {
                self.datas = self.datas.map((kmlData) => togeojson.kml(kmlData));
            }
            map.on('load', () => self.addLayersToMap(self.datas));
        });
    }
    addSimpleDataSourceToMap(data) {
        let overlaySourceConfig = {
            'type': 'geojson',
            'data': data,
        };
        if (this.attribution) {
            overlaySourceConfig['attribution'] = this.attribution;
        }
        map.addSource(this.id, overlaySourceConfig);
        return this.id;
    }
    addSimpleLayerToMap(dataSource) {
        throw 'Unimplemented';
    }
    addLayersToMap(datas) {
        let data = datas[0];
        let dataSource = this.addSimpleDataSourceToMap(data);
        this.addSimpleLayerToMap(dataSource);
        this.addedLayerIDs = [this.id];
        trySortOverlays();
    }
}

class LineOverlay extends BaseOverlay {
    lineOptions;
    constructor(id, name, dataURLs, lineOptions, attribution = undefined, defaultVisibility = 'visible', dataType = 'geojson') {
        super(id, name, dataURLs, attribution, defaultVisibility, dataType);
        this.lineOptions = lineOptions;
    }
    addSimpleLayerToMap(dataSource) {
        map.addLayer({
            'id': this.id,
            'type': 'line',
            'source': dataSource,
            'layout': {
                'line-join':  this.lineOptions['line-join'] || 'round',
                'line-cap':   this.lineOptions['line-cap'] || 'round',
                'visibility': this.defaultVisibility,
            },
            'paint': {
                'line-color':   this.lineOptions['line-color'],
                'line-opacity': this.lineOptions['line-opacity'] || 1,
                'line-width':   this.lineOptions['line-width'],
                'line-offset':  this.lineOptions['line-offset'] || 0,
            },
        }, firstSymbolId);

        if (this.lineOptions.hasOwnProperty('line-dasharray')) {
            map.setPaintProperty(this.id, 'line-dasharray', this.lineOptions['line-dasharray']);
        }
    }
    getLegendIcon() {
        //
        // Return an SVG element which contains an icon which visually represents the given overlay.
        //
        // Returns:
        //   An SVG DOM element which can be appended to anything.

        let width_px = 25;
        let height_px = 16;

        // first, make the overall SVG object.
        let previewSVG = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
        previewSVG.setAttribute('width', width_px);
        previewSVG.setAttribute('height', height_px);
        previewSVG.setAttribute('viewBox', [0, 0, width_px, height_px].join(""));
        previewSVG.setAttribute('class', 'overlay-preview-icon');

        // then, add a background which is opaque white.
        let previewBackgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        previewBackgroundRect.setAttribute('x', '0%');
        previewBackgroundRect.setAttribute('y', '0%');
        previewBackgroundRect.setAttribute('width', '100%');
        previewBackgroundRect.setAttribute('height', '100%');
        previewBackgroundRect.setAttribute('fill', '#fff');
        previewSVG.appendChild(previewBackgroundRect);

        // finally, draw a sample line similar in appearance to the actual overlay lines.
        let previewLineRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        previewLineRect.setAttribute("y", height_px / 2 - this.lineOptions['line-width'] / 2);
        previewLineRect.setAttribute("width", "100%");
        previewLineRect.setAttribute("height", this.lineOptions['line-width']);
        previewLineRect.setAttribute("fill", this.lineOptions['line-color']);
        previewSVG.appendChild(previewLineRect);
        return previewSVG;
    }
}

class SymbolOverlay extends BaseOverlay {
    symbolOptions;
    constructor(id, name, dataURLs, symbolOptions, attribution = undefined, defaultVisibility = 'visible', dataType = 'geojson') {
        super(id, name, dataURLs, attribution, defaultVisibility, dataType);
        this.symbolOptions = symbolOptions;
    }
    addLayersToMap(datas) {
        let data = datas[0];
        let dataSource = this.addSimpleDataSourceToMap(data);
        map.loadImage(
            this.symbolOptions['marker-url'],
            (error, image) => {
                if (error) {throw error;}
                map.addImage(this.id + '-marker', image);
                map.addLayer({
                    'id': this.id,
                    'type': 'symbol',
                    'source': dataSource,
                    'layout': {
                        'icon-image': this.id + '-marker',
                        'text-field': ["step", ["zoom"],
                            '',                 // from zoom levels 0-12, no label
                            13, ['get', 'name'] // at zoom level 13+, show a label!
                        ],
                        'text-font': [
                            'Open Sans Semibold',
                            'Arial Unicode MS Bold'
                        ],
                        'text-offset': [0, 1.25],
                        'text-anchor': 'top',
                        'visibility': this.defaultVisibility,
                    }
                });
                this.addedLayerIDs = [this.id];
                trySortOverlays();
            }
        );
    }
}

class CrashHeatmapOverlay extends BaseOverlay {
    options;
    constructor(id, name, dataURLs, options, attribution = undefined, defaultVisibility = 'visible', dataType = 'geojson') {
        super(id, name, dataURLs, attribution, defaultVisibility, dataType);
        this.options = options;
    }
    addLayersToMap(datas) {
        let data = datas[0];
        let dataSource = this.addSimpleDataSourceToMap(data);
        // Make both a Mapbox GL "heatmap" AND a Mapbox GL "circle" layer.  The heatmap layer will
        // appear at lower zoom levels, while the circle layer will appear at higher zoom levels.
        let layerIdHeatmap = this.id + '-heatmap';
        let layerIdPoints = this.id + '-points';
        map.addLayer({
            'id': layerIdHeatmap,
            'type': 'heatmap',
            'source': dataSource,
            maxzoom: 15,
            'layout': {
                'visibility': this.defaultVisibility,
            },
            'paint': {
                // assign weight dynamically
                'heatmap-weight': this.options['heatmap-weight'],
                // increase intensity as zoom level increases
                'heatmap-intensity': {
                    stops: [
                        [9,  0.05],
                        [11, 0.50],
                        [15, 1.50],
                        // >= zoom level 15 the heatmap is completely hidden and points are shown.
                    ]
                },
                // assign color values dynamically
                'heatmap-color': this.options['heatmap-color'],
                // increase radius as zoom increases
                'heatmap-radius': {
                    stops: [
                        [11, 15],
                        [15, 20]
                    ]
                },
                // decrease opacity to transition into the circle layer
                'heatmap-opacity': {
                    default: 1,
                    stops: [
                        [14, 1],
                        [15, 0]
                    ]
                }
            }
        }, firstSymbolId);

        // Point layer shows up after zooming in far enough.
        map.addLayer({
            'id': this.id + '-points',
            type: 'circle',
            source: dataSource,
            minzoom: 14,
            'layout': {
                'visibility': this.defaultVisibility,
            },
            paint: {
                'circle-radius': this.options['circle-radius'] || 10,
                'circle-color': this.options['circle-color'],
                'circle-stroke-color': 'black',
                'circle-stroke-width': 1,
                'circle-opacity': {
                    stops: [
                        // The circles only begin to appear at zoom level 14 which is
                        // when the heatmap begins to fade away.
                        [14, 0],
                        // At zoom level 15, the heatmap has completely disappeared, so
                        // make the circles completely opaque.
                        [15, 1],
                    ]
                }
            }
        }, firstSymbolId);

        // Update the overlay configs to signal to other overlays that they can add behind.
        this.addedLayerIDs = [layerIdHeatmap, layerIdPoints];
        trySortOverlays();
    }
}

class CountyBoundaryOverlay extends BaseOverlay {
    options;
    constructor(id, name, dataURLs, options, attribution = undefined, defaultVisibility = 'visible', dataType = 'geojson') {
        super(id, name, dataURLs, attribution, defaultVisibility, dataType);
        this.options = options;
    }
    addLayersToMap(datas) {
        let data = datas[0];
        // For this overlay, draw two layers: one to shade darker all areas outside of the county,
        // and another to draw a line on the county boundary.

        let outlineLayer = this.id + '-outline';
        let shadedLayer = this.id + '-shaded';

        // Add two data sources.
        map.addSource(outlineLayer, {'type': 'geojson', 'data': data});
        let dataInverted = cloneDeep(data);
        dataInverted.features[0].geometry.coordinates[0].unshift([
            // Invert the first (hopefully only) polygon by adding a box around the entire world.
            [180, -90], [180, 90], [-180, 90], [-180, -90]
        ]);
        map.addSource(shadedLayer, {'type': 'geojson', 'data': dataInverted});

        // add layer for the line around the county.
        map.addLayer({
            'id': outlineLayer,
            'type': 'line',
            'source': outlineLayer,
            'layout': {
                'line-join':  this.options['line-join'] || 'round',
                'line-cap':   this.options['line-cap'] || 'round',
                'visibility': this.defaultVisibility,
            },
            'paint': {
                'line-color':   this.options['line-color'],
                'line-opacity': this.options['line-opacity'] || 1,
                'line-width':   this.options['line-width'],
                'line-offset':  this.options['line-offset'] || 0,
            },
        }, firstSymbolId);

        // add layer for the shading outside the county.
        map.addLayer({
            'id': shadedLayer,
            'type': 'fill',
            'source': shadedLayer,
            'layout': {
                'visibility': this.defaultVisibility,
            },
            'paint': {
                'fill-color':   this.options['fill-color'],
                'fill-opacity': this.options['fill-opacity'] || 1,
            }
        }, firstSymbolId);

        // Update the overlay configs to signal to other overlays that they can add behind.
        this.addedLayerIDs = [outlineLayer, shadedLayer];
        trySortOverlays();
    }
}

class CouncilDistrictsOverlay extends BaseOverlay {
    options;
    constructor(id, name, dataURLs, options, attribution = undefined, defaultVisibility = 'visible', dataType = 'geojson') {
        super(id, name, dataURLs, attribution, defaultVisibility, dataType);
        this.options = options;
    }
    addLayersToMap(datas) {
        // For this overlay, draw two layers: one to outline the council districts and another as a symbol for each.

        let outlineLayer = this.id + '-outline';
        let symbolsLayer = this.id + '-symbols';

        map.addSource(outlineLayer, {'type': 'geojson', 'data': datas[0]});
        map.addSource(symbolsLayer, {'type': 'geojson', 'data': datas[1]});

        // add layer for the line around the county.
        map.addLayer({
            'id': outlineLayer,
            'type': 'line',
            'source': outlineLayer,
            'layout': {
                'line-join':  this.options['line-join'] || 'round',
                'line-cap':   this.options['line-cap'] || 'round',
                'visibility': this.defaultVisibility,
            },
            'paint': {
                'line-color':   this.options['line-color'],
                'line-opacity': this.options['line-opacity'] || 1,
                'line-width':   this.options['line-width'],
                'line-offset':  this.options['line-offset'] || 0,
            },
        });

        // add layer for the shading outside the county.
        map.addLayer({
            'id': symbolsLayer,
            'type': 'symbol',
            'source': symbolsLayer,
            'layout': {
                'visibility': this.defaultVisibility,
                'text-size': 32,
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-field': ['get', 'DISTRICT'],
                'symbol-sort-key': 0,
            },
            'paint': {
                'text-color': this.options['line-color'],
                'text-halo-color': 'rgba(255, 255, 255, 128)',
                'text-halo-width': 3,
            }
        });

        this.addedLayerIDs = [outlineLayer, symbolsLayer];
    }
}

const countyBoundaryOverlay = new CountyBoundaryOverlay(
    'countyBoundary',
    'SD County Boundary',
    ['static/overlays/sd_county_boundary.geojson'],
    {
        'line-color':   '#888',
        'line-opacity': 0.5,
        'line-width':   6,
        'line-offset':  -6,
        'fill-color':   '#888',
        'fill-opacity': 0.2,
    },
);

const bikeLanesOverlay = new LineOverlay(
    'bikeLanes',
    'OSM Bike Lanes',
    ['static/overlays/current_bike_infrastructure.geojson'],
    {
        'line-color': '#22f',
        'line-width': 3,
    },
    'OSM Bike Lanes &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
);
/*
campaigns: {
    'name':               'BikeSD Campaigns',
    'data-url':           'static/overlays/campaigns.geojson',
    'type':               'line',
    'default-visibility': 'visible',
    'attribution':        '',
    'line-color':         '#282',
    'line-width':         6,
    'line-dasharray':     [3, 2],
    'line-join': 'bevel',
    'line-cap': 'square',
},
*/
const sexyStreetsOverlay = new LineOverlay(
    'sexyStreets',
    'SD "Sexy Streets"',
    ['https://www.google.com/maps/d/kml?forcekml=1&mid=14jDx5zS0vM4lMZRxtzLcF2hw_f_jUC82'],
    { // options
        'line-color':  '#d10069',
        'line-width':  2,
    },
    'Sexy Streets &copy; Jacob Mandel and SANDAG', // attribution
    'visible', // defaultVisibility
    'kml', // dataType
);

const councilDistrictsOverlay = new CouncilDistrictsOverlay(
    'councilDistricts',
    'Council Districts',
    ['static/overlays/council_districts.geojson', 'static/overlays/council_district_centers.geojson'],
    { // options
        'line-color':  '#292',
        'line-width':  5,
    },
    'Council Districts &copy; SanGIS', // attribution
    'none', // defaultVisibility
);

const schoolsOverlay = new SymbolOverlay(
    'schools',
    'Schools',
    ['static/overlays/schools.geojson'],
    {
        'marker-url': 'icons/college.png',
        'text-field': [
            'step', ['zoom'],
            '',                 // from zoom levels 0-12, no label
            13, ['get', 'name'] // at zoom level 13+, show a label based on the name attribute!
        ],
    },
    'Schools &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    'none',
);

const crashesOverlay = new CrashHeatmapOverlay(
    'crashes',
    'Crashes (2011-2020)',
    ['static/overlays/crashes.geojson'],
    {
        // assign color values be applied to points depending on their density
        'heatmap-color': [
            'interpolate', ['linear'],
            ['heatmap-density'], // interpolation input value
            0,   'rgba(180, 180, 0, 0)',
            0.2, 'rgba(180, 180, 0, 1)',
            1.0, 'rgba(180,   0, 0, 1)',
        ],
        'circle-radius': 10,
        'circle-color': {
            property: 'COLLISION_SEVERITY',
            type: 'categorical',
            stops: [
                [1, '#f00'], // red: collision severity 1 (killed)
                [2, '#f70'], // reddish: collision severity 2 (severe injury)
                [3, '#fb0'], // yellowish: collision severity 1 (injury)
                [4, '#ff0'], // yellow: collision severity 1 (complaint of pain)
            ]
        },
        // increase weight as diameter breast height increases
        'heatmap-weight': [
            'interpolate', ['linear'],
            ['to-number', ['get', 'COLLISION_SEVERITY']], // interpolation input value
            1, 1.0, // at collision severity 1 (someone killed), the weight at the maximum.
            // between severity 4-1, linearly interpolate the weight.
            4, 0.3, // at collision severity 4 (minor injury), the weight is low, at only 0.3.
        ],
    },
    'Crashes &copy; TIMS/UC Berkeley',
    'none',
);

const allOverlays = [
    bikeLanesOverlay,
    countyBoundaryOverlay,
    crashesOverlay,
    schoolsOverlay,
    sexyStreetsOverlay,
    councilDistrictsOverlay,
];
const renderOrder = [
    countyBoundaryOverlay,
    crashesOverlay,
    bikeLanesOverlay,
    sexyStreetsOverlay,
];
const menuOrder = [
    bikeLanesOverlay,
    councilDistrictsOverlay,
    sexyStreetsOverlay,
    schoolsOverlay,
    crashesOverlay,
];

function trySortOverlays() {
    //
    // Sort all the layers of the overlays based on the predetermined overlayRenderOrder.
    //

    // Only attempt sorting once all the layers have been added to the map.
    if (!renderOrder.every((overlay) => overlay.isReady())) {
        return;
    }
    // Make a list of ordered layers from the ordered overlays.  By now, we should be complete adding all the
    // layers, so all the overlay configs should have layer IDs filled in.
    let layerRenderOrder = renderOrder.map(
        (overlay) => overlay.addedLayerIDs
    ).flat();
    // Append the first symbol id to give us an anchor.  All the layers we're dealing with in this function should
    // be non-text layers.
    layerRenderOrder.push(firstSymbolId);
    // Finally, iterate the layer render order in reverse because moveLayer() only supports adding behind a
    // specified layer.
    for (let i = layerRenderOrder.length - 2; i >= 0; i--) {
        map.moveLayer(layerRenderOrder[i], layerRenderOrder[i+1]);
    }
}

function toggleOverlayVisibility(linkElement) {
    //
    // One of the overlay links was clicked, so toggle the both the visibility of that overlay
    // and the link itself.
    //
    // Args:
    //   - linkElement: The link element clicked.

    let overlayById = menuOrder.reduce(function(obj, overlay) {
        obj[overlay.id] = overlay;
        return obj;
    }, {});
    let overlay = overlayById[linkElement.id];
    const currentVisibility = map.getLayoutProperty(overlay.addedLayerIDs[0], 'visibility') ?? 'visible';

    // Toggle layer visibility by changing the layout object's visibility property.
    if (currentVisibility === 'visible') {
        linkElement.className = '';
        overlay.addedLayerIDs.forEach(
            (layerId) => map.setLayoutProperty(layerId, 'visibility', 'none')
        );
    } else {
        linkElement.className = 'active';
        overlay.addedLayerIDs.forEach(
            (layerId) => map.setLayoutProperty(layerId, 'visibility', 'visible')
        );
    }

}

// Set up the corresponding toggle button for each overlay.
for (const overlay of menuOrder) {
    const linkElement = document.createElement('a');
    linkElement.id = overlay.id;
    linkElement.href = '#';

    // Create and add a preview icon of the current overlay.  This only gets added for supported
    // overlay types which we actually know how to draw previews for, currently just lines.
    let legendIcon = overlay.getLegendIcon();
    if (legendIcon) {
        linkElement.appendChild(legendIcon);
    }

    // Make the link text the pretty name of the overlay.
    const layerNameElement = document.createElement('span');
    layerNameElement.textContent = overlay.name;
    linkElement.appendChild(layerNameElement);

    linkElement.className = overlay.defaultVisibility == 'visible' ? 'active' : '';

    // Show or hide layer when the toggle is clicked.
    linkElement.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleOverlayVisibility(linkElement);
    };

    // Add the new overlay toggle button to the menu.
    document.getElementById('overlays-menu').appendChild(linkElement);
}

// Index of the first symbol layer in the map style.
var firstSymbolId;

// Once the map is loaded, determine the firstSymbolId which is used as a
// heuristic for adding new layers.
map.on('load', () => {
    // Find the index of the first symbol layer in the map style.  This
    // helps us later add data layers beneath the map symbols like street
    // names and neighborhood names.
    for (const layer of map.getStyle().layers) {
        if (layer.type === 'symbol') {
            firstSymbolId = layer.id;
            break;
        }
    }
});

// loop over each overlay layer and fetch the data.
for (const overlay of allOverlays) {
    overlay.run();
}

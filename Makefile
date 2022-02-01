
.DEFAULT_GOAL := local

requirements :
	npm ci

layers/current_bike_infrastructure.osm : queries/current_bike_infrastructure.osm
	wget -O $@ --post-file=$< "https://overpass-api.de/api/interpreter"

layers/current_bike_infrastructure.geojson : layers/current_bike_infrastructure.osm
	node_modules/osmtogeojson/osmtogeojson $< >$@

fetch-osm-data : layers/current_bike_infrastructure.geojson

local : fetch-osm-data
	python3 -m http.server


.DEFAULT_GOAL := local
.PHONY : requirements fetch-osm-data

requirements : 
	npm ci
fetch-osm-data : layers/current_bike_infrastructure.geojson
local : fetch-osm-data requirements
	python3 -m http.server

layers/current_bike_infrastructure.geojson : layers/current_bike_infrastructure.osm
	node_modules/osmtogeojson/osmtogeojson $< >$@
layers/current_bike_infrastructure.osm : queries/current_bike_infrastructure.osm
	wget -O $@ --post-file=$< "https://overpass-api.de/api/interpreter"



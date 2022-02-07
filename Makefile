
.DEFAULT_GOAL := local
.PHONY : requirements fetch-osm-data

update-requirments :
	pip install -r requirements-pip.txt
	pip-compile requirements.in
requirements : 
	npm ci
	pip install -r requirements.txt
fetch-osm-data : layers/current_bike_infrastructure.geojson layers/schools.geojson layers/sexy_streets.geojson layers/crashes.geojson
local : fetch-osm-data requirements
	python3 -m http.server

layers/current_bike_infrastructure.geojson : layers/current_bike_infrastructure.osm
	node_modules/osmtogeojson/osmtogeojson $< >$@
layers/current_bike_infrastructure.osm : queries/current_bike_infrastructure.osm
	wget -O $@ --post-file=$< "https://overpass-api.de/api/interpreter"

layers/schools.geojson : layers/schools.osm
	node_modules/osmtogeojson/osmtogeojson $< >$@
layers/schools.osm : queries/schools.osm
	wget -O $@ --post-file=$< "https://overpass-api.de/api/interpreter"

layers/sexy_streets.geojson : raw_data/San\ Diego\ Sexy\ Streets\ Projects\ FY22-23.kml
	node_modules/@mapbox/togeojson/togeojson "$<" >$@

layers/crashes.geojson : raw_data/TIMS/Crashes.csv raw_data/TIMS/Victims.csv
	gis/crashes.py

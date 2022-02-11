#!/usr/bin/env python3

import geopandas as gpd

districts_df = gpd.read_file('raw_data/Council_Districts.zip').to_crs(epsg=4326)
centers_df = districts_df.copy()
centers_df['geometry'] = centers_df.centroid

# Write out geojson
districts_df.to_file("layers/council_districts.geojson", driver="GeoJSON")
centers_df.to_file("layers/council_district_centers.geojson", driver="GeoJSON")

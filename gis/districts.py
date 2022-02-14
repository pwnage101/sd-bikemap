#!/usr/bin/env python3

import geopandas as gpd

# First, project the source data to a an equal-area CRS optimized for the
# contiguous US.  Subsequent simplify() and centroid calculations will benefit
# from this meters-based projection.
original_districts_df = gpd.read_file('raw_data/Council_Districts.zip').to_crs(epsg=2163)

# Simplify the council districts geometries so that we can deliver a 400 KB
# uncompressed file instead of a 4 MB uncompressed file.
districts_df = original_districts_df.copy()
districts_df['geometry'] = districts_df.geometry.simplify(10).to_crs(epsg=4326)
districts_df.to_file("static/overlays/council_districts.geojson", driver="GeoJSON")

# Find good coordinates for symbol placement.
centers_df = original_districts_df.copy()
centers_df['geometry'] = centers_df.centroid.to_crs(epsg=4326)
centers_df.to_file("static/overlays/council_district_centers.geojson", driver="GeoJSON")

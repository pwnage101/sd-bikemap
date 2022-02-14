#!/usr/bin/env python3

import geopandas as gpd

# First, project the source data to a an equal-area CRS optimized for the
# contiguous US.  Subsequent simplify() and centroid calculations will benefit
# from this meters-based projection.
bike_infra_df = gpd.read_file('static/overlays/current_bike_infrastructure_highres.geojson').to_crs(epsg=2163)

# Simplify the council districts geometries so that we can deliver a 400 KB
# uncompressed file instead of a 4 MB uncompressed file.
bike_infra_df["geometry"] = bike_infra_df.geometry.simplify(5).to_crs(epsg=4326)
geojson = bike_infra_df.to_json(na="drop", drop_id=True)
with open("static/overlays/current_bike_infrastructure.geojson", "w") as geojson_file:
    geojson_file.write(geojson)

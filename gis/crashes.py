#!/usr/bin/env python3

import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

crashes_df = pd.read_csv("raw_data/TIMS/Crashes.csv")
victims_df = pd.read_csv("raw_data/TIMS/Victims.csv")

# Narrow down the crashes columns to include only fields shown on the map
crashes_df = crashes_df[
    [
        "CASE_ID",
        "COLLISION_DATE",
        "COLLISION_SEVERITY",
        "POINT_X",
        "POINT_Y",
    ]
]

# Narrow down the victims columns to include only fields shown on the map
victims_df = victims_df[
    [
        "CASE_ID",
        "VICTIM_AGE",
        "VICTIM_ROLE",
    ]
]

# Vicim roles 3 and 4 mean "Pedestrian" and "Bicyclist" respectively.
victims_df = victims_df[(victims_df["VICTIM_ROLE"] == 3) | (victims_df["VICTIM_ROLE"] == 4)]
victims_df["VICTIM_ROLE"] = victims_df["VICTIM_ROLE"].map({3: "pedestrian", 4: "bicyclist"})

# Narrow down the victims records to include the youngest one for a given crash.
victims_df = victims_df[victims_df.groupby(["CASE_ID"])["VICTIM_AGE"].transform(min) == victims_df["VICTIM_AGE"]]
victims_df = victims_df[["CASE_ID", "VICTIM_AGE", "VICTIM_ROLE"]]

# Join victims into crashes
crashes_df = crashes_df.merge(victims_df, how='left')

# Convert cleaned and filtered crash data into a geopandas dataframe
crashes_geometry = [Point(xy) for xy in zip(crashes_df["POINT_X"], crashes_df["POINT_Y"])]
crashes_df = crashes_df.drop(["POINT_X", "POINT_Y"], axis=1)
crashes_gdf = gpd.GeoDataFrame(crashes_df, crs="EPSG:4326", geometry=crashes_geometry)

# Write out geojson
crashes_gdf.to_file("static/overlays/crashes.geojson", driver="GeoJSON")

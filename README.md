# sd-bikemap

An interactive map of San Diego with various toggleable overlays which contain
useful information for bicycle advocates.

## Local tools setup

1. Install `npm` (node package manager).
2. Install Python 3 (>=3.8).
3. Invoke `make requirements`

## Update overlay data

### OSM-backed data

To update any overlays powered by OSM (i.e. OSM bike lanes, Schools, etc.)
simply invoke `make`.  This will fetch the latest OSM data from
overpass-turbo.eu and convert it to geojson format.

### Crash data

Raw crash data is located under `raw_data/TIMS/`.

To update crash data, that would require that you register a personal TIMS
account at <https://tims.berkeley.edu/>, then using the ["SWITRS Query & Map"
tool](https://tims.berkeley.edu/tools/query/index.php?clear=true) select the
following parameters or similar:

* Date: 2011-01-01 -> 2020-12-31
* County: San Diego
* City: All
* Crash Filters:
  * Motor Vehicle Involved with...
    * B - Pedestrian
    * G - Bicycle

Then, click "Show Results".  On the next page, click "Download Raw Data".  Save
Crashes data to `raw_data/TIMS/Crashes.csv` and save Victims data to
`raw_data/TIMS/Victims.csv`

### SD Sexy Streets data

Raw SD Sexy Streets data is located under `raw_data/San Diego Sexy Streets Projects FY22-23.kml`.

There's no public data source for this---ask BikeSD if you are looking for a
newer version.

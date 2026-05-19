# Yama Museum

A web application for visualizing and analyzing mountaineering location data (GPX) and activity logs from the YAMAP app.

## Interactive Map
You can view the consolidated mountaineering traces and points on our official Google My Maps:
**[Yama Museum - Google My Maps](https://www.google.com/maps/d/edit?mid=1-hJRCtAmD6DF9-nMQOwftdz7v5vVTWo&usp=sharing)**

## Data Source
The GPX data and activity logs in this repository are based on the mountaineering records of **Professor Yoshitomi of Ehime University**.

## Project Structure
- `gpx/raw/`: Raw track files (.gpx).
- `gpx/annotated/`: GPX files with detected peak waypoints.
- `gpx/merged/`: Yearly consolidated GPX files for My Maps.
- `csv/`: Processed activity records (.csv).
- `processed/`: Archive of original ZIP/XLSX files.
- `.agents/`: Automation skills and agent instructions.

## For Developers & AI Agents
Please refer to **[AGENTS.md](AGENTS.md)** for detailed directory descriptions and automated skill instructions. You can use the local `yama-data-pipeline` skill to automatically validate, intake, merge, and annotate GPX data.

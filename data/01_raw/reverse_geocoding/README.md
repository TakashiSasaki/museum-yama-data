# Reverse Geocoding Raw Cache

This directory stores raw reverse geocoding API response cache files.
These files are external source snapshots.
They may be re-fetchable, but re-fetching may be slow, rate-limited, or produce changed results.
Normal processing should use the existing local cache.

This directory is not for normalized municipality tables.
This directory is not for derived location enrichment outputs.
Future derived outputs should go to later pipeline layers after a separate mapping/design task.

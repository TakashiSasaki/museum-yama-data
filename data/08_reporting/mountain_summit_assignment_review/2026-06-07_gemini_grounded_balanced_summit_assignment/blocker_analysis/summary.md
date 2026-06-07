# Blocker Analysis Summary

## Core Counts
* Total GPX-supported assignments: 81
* Manifest activity links record count: 293
* Actual activity links JSONL record count: 293
* Discrepancy between manifest and actual: No

## Simulation Results
* Passes S0 (Current policy): 2
* Passes S1 (Relax distance to 300m, exact/boundary muni, ignore ele mismatch): 3
* Passes S2 (Relax distance to 300m, exact/boundary/adjacent muni, default mismatch rules): 3
* Passes S3 (Relax distance to 500m, exact name match, exact/boundary muni): 5
* Passes S4 (Same as S2, but elevation mismatch threshold is 300m): 3
* Passes S5 (Same as S2, but ignore CSV coordinate mismatch since it's legacy/unverified): 3

## Sharing Diagnostics
* Total unique proposed candidate IDs: 67
* Shared candidate IDs (count > 1): 10

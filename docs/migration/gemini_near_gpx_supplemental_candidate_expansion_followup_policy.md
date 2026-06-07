# Gemini-Near GPX Supplemental Candidate Expansion Followup Policy

This document establishes the official followup policy and rules for using and refining the supplemental candidates generated in Stage 30.

---

## 1. Path Normalization Policy

* **Issue**: The current Stage 30 output contains local absolute paths (e.g. starting with `C:\Users\...`) inside the `evidence.source_file_provenance` fields.
* **Policy**: Future pipeline generators must strictly enforce repository-relative path normalization for all evidence, manifests, and logging outputs to guarantee portability across Windows, Mac, and Linux environments.
* **Preservation**: The existing Stage 30 output data remains untouched in this cleanup to preserve historical run integrity.

---

## 2. Canonical-vs-Supplemental Duplicate Policy

* **Issue**: Some generated supplemental candidates duplicate or nearly duplicate existing canonical summit candidates.
* **Policy**: A downstream assignment experiment using both sets of candidates must resolve conflicts using the following duplicate rules:
  - **Duplicate Radius**: If a supplemental candidate is located within **30 meters** of an existing canonical candidate, the supplemental candidate is considered a duplicate.
  - **Preference**: The pipeline must prefer and retain the **canonical candidate** over the supplemental candidate for assignment decisions.
  - **Fallback**: Supplemental candidates farther than 30 meters from any canonical candidate may be used as fallback review-planning evidence, but they remain non-canonical and require human review.

---

## 3. Grounding Count Definitions

To reconcile differing counts in past documentation:
* **Usable Grounding Coordinates (`333`)**: The absolute number of records in the Gemini grounding reference index (`grounding_reference_index.jsonl`) that contain valid coordinates. This is the denominator for candidate grounding search.
* **Grounded Assignments (`295`)**: The subset of mountains in the proposed assignment output that were assigned coordinates (either from GPX or Gemini).
* **GPX-Supported Assignments (`81`)**: The subset of grounded assignments that have linked GPX tracks. This was the exact number of eligible candidate sources for the Stage 30 run.

---

## 4. Requirements for the Next Assignment Experiment

* Validate all inputs using `validate` CLI subcommand.
* Ensure Stage 25 remains the current entry point for active human review.
* Do not merge or replace canonical candidates with supplemental candidates without explicit user approval.
* The duplicate-handling policy must be implemented programmatically in any future assignment logic that consumes Stage 30 outputs.

---

## 5. Non-Goals

* Do not promote supplemental candidates to canonical status automatically.
* Do not overwrite or mutate the primary `summit_candidates.jsonl` file.
* Do not regenerate Stage 27 or Stage 28 assignment outputs during this followup phase.

# Provenance and Lineage Graph Policy

## Purpose
The project needs to visualize, as a graph, which data was generated from which data and by which method. This provides clarity on data lineage, ensuring every output can be traced back to its raw inputs and the specific transformations applied.

## Scope
At first, the model will focus on dataset-level and pipeline-stage-level lineage. Later, it will be extended to entity-level lineage, covering elements such as:
- `activity_id`
- `candidate_id`
- `mountain_id`
- resolved mountain waypoint
- evidence source

## Minimal Graph Model
The graph model will consist of three conceptual node classes:

1. **Data/entity nodes:** Represents the datasets, files, or specific entities.
2. **Process/activity nodes:** Represents the pipeline stages, scripts, or manual actions.
3. **Evidence/method nodes:** Represents the supporting information, policies, or logic used in a process.

### Edge Types
Edges will define the relationships between the nodes. Expected types include:
- `used_by`
- `generated_by`
- `derived_from`
- `supported_by`
- `disambiguated_by`
- `exported_from`
- `validated_by`

## Suggested Tabular Representation
These relationships can be stored as tabular datasets. Future logical datasets may include:
- `provenance_entities`
- `provenance_activities`
- `provenance_edges`

**Potential future paths (conceptual only, not currently tracked):**
- `data/04_feature/provenance/entities.*`
- `data/04_feature/provenance/activities.*`
- `data/04_feature/provenance/edges.*`
- `data/08_reporting/provenance/lineage.graphml`
- `data/08_reporting/provenance/lineage.graphology.json`
- `data/08_reporting/provenance/lineage.dot`

*Note: Do not create these data directories or data files currently. They are placeholders for future pipeline development.*

## Visualization Outputs
Future graph exports derived from this data may include:
- **GraphML**
- **Graphology JSON**
- **DOT / Graphviz**
- **static HTML visualization**

## Relationship to Kedro and DVC
- **Kedro** describes logical datasets and pipeline nodes.
- **DVC** describes stage-level dependencies and execution reproducibility.
- **The explicit provenance graph** acts as the project’s richer lineage model, going beyond execution metadata to capture entity-level origins and evidence mapping.
- **The GitHub Pages site** should provide an overview of this graph, initially at the dataset/stage level, allowing users to inspect the lineage and data relationships.

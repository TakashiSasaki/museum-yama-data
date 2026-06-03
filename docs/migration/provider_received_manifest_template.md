# Provider Received Manifest Template

**Note: This is a template.** Do not fill it with real provider data unless the data is already explicitly known and approved.

```yaml
provider_slug: <provider_slug>
provider_display_name: <display_name_or_organization>
received_date: <YYYY-MM-DD>
original_filename: <original_filename.ext>
stored_path: <data/01_raw/provider_received/provider_slug/YYYY-MM-DD/original_filename.ext>
file_format: <file_format_or_mime_type>
source_description: <brief description of what the file contains>
received_from: <contact_person_or_system>
license_or_permission_status: <unknown | permitted | restricted | needs_review>
contains_personal_data: <yes | no | unknown>
contains_private_data: <yes | no | unknown>
checksum_algorithm: <sha256>
checksum: <hex_digest>
notes: <additional context, e.g., why modification time was used for received date if applicable>
```
